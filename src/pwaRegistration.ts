import { useEffect, useState } from 'react';

declare const __APP_BUILD_ID__: string | undefined;
declare const __APP_COMMIT_SHA__: string | undefined;
declare const __APP_BUILD_TIMESTAMP__: number | undefined;
declare const __APP_DEFAULT_LIVE_URL__: string | undefined;

export const CACHED_BUILD_ID_STORAGE_KEY = 'wizardchess_cached_build_id';
export const CACHED_COMMIT_SHA_STORAGE_KEY = 'wizardchess_cached_commit_sha';
export const APPLIED_OTA_BUILD_ID_KEY = 'wizardchess_applied_ota_build_id';
export const APPLIED_OTA_COMMIT_SHA_KEY = 'wizardchess_applied_ota_commit_sha';
export const APPLIED_OTA_TIMESTAMP_KEY = 'wizardchess_applied_ota_timestamp';
export const OTA_READY_TO_BOOT_KEY = 'wizardchess_ota_ready_to_boot';
export const GITHUB_REPO_STORAGE_KEY = 'wizardchess_github_repo';
export const GITHUB_BRANCH_STORAGE_KEY = 'wizardchess_github_branch';
export const OTA_LIVE_URL_STORAGE_KEY = 'wizardchess_ota_live_url';

export const DEFAULT_CLOUD_RUN_LIVE_URL =
  typeof __APP_DEFAULT_LIVE_URL__ === 'string' && __APP_DEFAULT_LIVE_URL__.startsWith('http')
    ? __APP_DEFAULT_LIVE_URL__
    : 'https://ais-pre-64yibneopxihyh3rjs6f74-281552636048.asia-southeast1.run.app';

export const COMPILED_BUILD_ID =
  typeof __APP_BUILD_ID__ === 'string' && __APP_BUILD_ID__
    ? __APP_BUILD_ID__
    : 'build-local-head';

export const COMPILED_COMMIT_SHA =
  typeof __APP_COMMIT_SHA__ === 'string' && __APP_COMMIT_SHA__
    ? __APP_COMMIT_SHA__
    : 'local-head';

export const COMPILED_BUILD_TIMESTAMP =
  typeof __APP_BUILD_TIMESTAMP__ === 'number' && __APP_BUILD_TIMESTAMP__ > 0
    ? __APP_BUILD_TIMESTAMP__
    : 0;

export interface GitHubUpdateConfig {
  githubRepo: string;
  branch: string;
  liveUrl: string;
}

export interface DetectedVersionUpdate {
  buildId: string;
  previousBuildId: string;
  commitSha?: string;
  commitMessage?: string;
  commitDate?: string;
  buildTimestamp?: number;
  source: 'github' | 'live-url' | 'server' | 'service-worker';
  liveUrl?: string;
  otaBaseUrl?: string;
  entryJs?: string;
  entryCss?: string;
  apkDownloadUrl?: string;
  releaseHtmlUrl?: string;
}

export interface StoredOtaBundle {
  buildId: string;
  commitSha: string;
  buildTimestamp: number;
  baseUrl: string;
  cssText: string;
  jsText: string;
  savedAt: number;
}

export interface DownloadProgressUpdate {
  percent: number;
  stepLabel: string;
  detailLabel: string;
  downloadedBytes: number;
  status: 'downloading' | 'ready-to-restart' | 'restarting' | 'error';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const OTA_IDB_NAME = 'wizardchess_ota_db_v1';
const OTA_IDB_STORE = 'bundles';
const OTA_IDB_KEY = 'active_bundle';
const OTA_CACHE_STORAGE_NAME = 'wizard-chess-ota-bundle-v1';
const OTA_CACHE_BUNDLE_URL = '/__wizardchess_ota_bundle__.json';

function openOtaIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(OTA_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OTA_IDB_STORE)) {
          db.createObjectStore(OTA_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveOtaBundleToStorage(bundle: StoredOtaBundle): Promise<boolean> {
  let savedIdb = false;
  let savedCache = false;

  // 1. Save to IndexedDB
  const db = await openOtaIndexedDB();
  if (db) {
    savedIdb = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(OTA_IDB_STORE, 'readwrite');
        const store = tx.objectStore(OTA_IDB_STORE);
        store.put(bundle, OTA_IDB_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        db.close();
        resolve(false);
      }
    });
  }

  // 2. Also save to CacheStorage as redundant backup across APK restarts
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OTA_CACHE_STORAGE_NAME);
      const res = new Response(JSON.stringify(bundle), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      await cache.put(OTA_CACHE_BUNDLE_URL, res);
      savedCache = true;
    } catch {
      // Ignore if CacheStorage unavailable
    }
  }

  try {
    localStorage.setItem(OTA_READY_TO_BOOT_KEY, 'true');
    localStorage.setItem(APPLIED_OTA_BUILD_ID_KEY, bundle.buildId);
    if (bundle.commitSha) {
      localStorage.setItem(APPLIED_OTA_COMMIT_SHA_KEY, bundle.commitSha);
    }
    if (bundle.buildTimestamp) {
      localStorage.setItem(APPLIED_OTA_TIMESTAMP_KEY, String(bundle.buildTimestamp));
    }
  } catch {
    // Ignore storage quota errors
  }

  return savedIdb || savedCache;
}

export async function loadOtaBundleFromStorage(): Promise<StoredOtaBundle | null> {
  // 1. Try IndexedDB first
  const db = await openOtaIndexedDB();
  if (db) {
    const fromIdb = await new Promise<StoredOtaBundle | null>((resolve) => {
      try {
        const tx = db.transaction(OTA_IDB_STORE, 'readonly');
        const store = tx.objectStore(OTA_IDB_STORE);
        const req = store.get(OTA_IDB_KEY);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as StoredOtaBundle) || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
    if (fromIdb && fromIdb.jsText) return fromIdb;
  }

  // 2. Fallback to CacheStorage backup
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OTA_CACHE_STORAGE_NAME);
      const matched = await cache.match(OTA_CACHE_BUNDLE_URL);
      if (matched) {
        const parsed = (await matched.json()) as StoredOtaBundle;
        if (parsed && parsed.jsText) return parsed;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

function rewriteBundleRelativeAssets(code: string, baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return code
    .replace(/(["'`])\.\/assets\//g, `$1${cleanBase}/assets/`)
    .replace(/(["'`])\/assets\//g, `$1${cleanBase}/assets/`)
    .replace(/url\(\s*(['"]?)\.\/assets\//g, `url($1${cleanBase}/assets/`)
    .replace(/url\(\s*(['"]?)\/assets\//g, `url($1${cleanBase}/assets/`);
}

export async function executeHotOtaBundleInPlace(bundle: StoredOtaBundle): Promise<boolean> {
  try {
    const win = window as unknown as Record<string, unknown>;
    win.__WIZARD_CHESS_RUNNING_OTA_PAYLOAD__ = true;
    win.__WIZARD_CHESS_ACTIVE_OTA_BUILD__ = {
      buildId: bundle.buildId,
      commitSha: bundle.commitSha,
      buildTimestamp: bundle.buildTimestamp
    };

    // Inject updated CSS and keep it at the end of <head> so it overrides baked-in APK CSS
    if (bundle.cssText) {
      let styleEl = document.getElementById('wizardchess-ota-live-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'wizardchess-ota-live-style';
      }
      styleEl.textContent = rewriteBundleRelativeAssets(bundle.cssText, bundle.baseUrl);
      document.head.appendChild(styleEl);
    }

    // Clean up any existing 3D canvas or root nodes if called mid-session
    const oldCanvas = document.getElementById('game-canvas');
    if (oldCanvas && oldCanvas.parentNode) {
      const freshCanvas = document.createElement('canvas');
      freshCanvas.id = 'game-canvas';
      oldCanvas.parentNode.replaceChild(freshCanvas, oldCanvas);
    }
    const rootEl = document.getElementById('root');
    if (rootEl && rootEl.parentNode) {
      const freshRoot = document.createElement('div');
      freshRoot.id = 'root';
      rootEl.parentNode.replaceChild(freshRoot, rootEl);
    }

    const rewrittenJs = rewriteBundleRelativeAssets(bundle.jsText, bundle.baseUrl);
    const blob = new Blob([rewrittenJs], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    await import(/* @vite-ignore */ blobUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Called at startup in src/main.tsx when the APK starts or restarts after downloading changes.
 * If a downloaded OTA bundle is stored in IndexedDB/CacheStorage and we are not already
 * inside the OTA payload execution, it boots the downloaded OTA bundle instead of the old APK code!
 */
export async function bootInstalledOtaBundleIfNewer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as Record<string, unknown>;
  // If we are ALREADY executing inside the imported OTA Blob payload, return false so main.tsx mounts <App />!
  if (win.__WIZARD_CHESS_RUNNING_OTA_PAYLOAD__) {
    return false;
  }

  try {
    const cached = await loadOtaBundleFromStorage();
    if (!cached || !cached.jsText) return false;

    const readyFlag = localStorage.getItem(OTA_READY_TO_BOOT_KEY) === 'true';
    const isDifferentBuild = Boolean(cached.buildId && cached.buildId !== COMPILED_BUILD_ID);
    const isNewerTimestamp =
      cached.buildTimestamp > 0 &&
      COMPILED_BUILD_TIMESTAMP > 0 &&
      cached.buildTimestamp >= COMPILED_BUILD_TIMESTAMP;

    if (isDifferentBuild && (readyFlag || isNewerTimestamp || isRunningInCapacitorOrAndroidWebView())) {
      const ok = await executeHotOtaBundleInPlace(cached);
      if (ok) return true;
      win.__WIZARD_CHESS_RUNNING_OTA_PAYLOAD__ = false;
    }
  } catch {
    win.__WIZARD_CHESS_RUNNING_OTA_PAYLOAD__ = false;
  }
  return false;
}

/**
 * Restarts the APK / WebView cleanly so downloaded changes & assets take effect from a fresh boot.
 */
export function restartApkToApplyChanges(): void {
  try {
    sessionStorage.setItem('wizardchess_ota_restarted_at', String(Date.now()));
  } catch {}

  try {
    const cleanPath = window.location.origin + window.location.pathname;
    window.location.replace(`${cleanPath}?ota_reboot=${Date.now()}`);
    window.setTimeout(() => {
      window.location.reload();
    }, 180);
  } catch {
    window.location.reload();
  }
}

export function sanitizeGitHubRepoInput(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || /^jemz\d*$/i.test(trimmed)) return '';
  const urlMatch = trimmed.match(/github\.com[:/]([^/]+\/[^/#?]+?)(?:\.git|\/)?$/i);
  if (urlMatch) return urlMatch[1];
  const pairMatch = trimmed.match(/^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/);
  if (pairMatch) return pairMatch[1];
  return '';
}

function sanitizeBranchInput(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || /^jemz\d*$/i.test(trimmed)) return 'main';
  return trimmed;
}

function sanitizeLiveUrlInput(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || /^jemz\d*$/i.test(trimmed)) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return '';
}

export function getGitHubUpdateConfig(): GitHubUpdateConfig {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const rawStoredRepo = localStorage.getItem(GITHUB_REPO_STORAGE_KEY) || '';
  const rawStoredBranch = localStorage.getItem(GITHUB_BRANCH_STORAGE_KEY) || '';
  const rawStoredLiveUrl = localStorage.getItem(OTA_LIVE_URL_STORAGE_KEY) || '';

  if (/^jemz\d*$/i.test(rawStoredRepo.trim())) {
    localStorage.removeItem(GITHUB_REPO_STORAGE_KEY);
  }
  if (/^jemz\d*$/i.test(rawStoredBranch.trim())) {
    localStorage.removeItem(GITHUB_BRANCH_STORAGE_KEY);
  }
  if (/^jemz\d*$/i.test(rawStoredLiveUrl.trim())) {
    localStorage.removeItem(OTA_LIVE_URL_STORAGE_KEY);
  }

  const githubRepo =
    sanitizeGitHubRepoInput(rawStoredRepo) ||
    sanitizeGitHubRepoInput(env.VITE_GITHUB_REPO || '');
  const branch =
    sanitizeBranchInput(rawStoredBranch) ||
    sanitizeBranchInput(env.VITE_GITHUB_BRANCH || 'main');
  let liveUrl =
    sanitizeLiveUrlInput(rawStoredLiveUrl) ||
    sanitizeLiveUrlInput(env.VITE_OTA_LIVE_URL || '') ||
    DEFAULT_CLOUD_RUN_LIVE_URL;

  if (!sanitizeLiveUrlInput(rawStoredLiveUrl) && githubRepo.includes('/')) {
    const [owner, repo] = githubRepo.split('/');
    if (owner && repo) {
      liveUrl = `https://${owner}.github.io/${repo}`;
    }
  }

  return { githubRepo, branch, liveUrl };
}

export function saveGitHubUpdateConfig(cfg: Partial<GitHubUpdateConfig>): GitHubUpdateConfig {
  if (cfg.githubRepo !== undefined) {
    const cleaned = sanitizeGitHubRepoInput(cfg.githubRepo);
    if (cleaned) localStorage.setItem(GITHUB_REPO_STORAGE_KEY, cleaned);
    else localStorage.removeItem(GITHUB_REPO_STORAGE_KEY);
  }
  if (cfg.branch !== undefined) {
    const cleanedBranch = sanitizeBranchInput(cfg.branch);
    localStorage.setItem(GITHUB_BRANCH_STORAGE_KEY, cleanedBranch);
  }
  if (cfg.liveUrl !== undefined) {
    const cleanedUrl = sanitizeLiveUrlInput(cfg.liveUrl);
    if (cleanedUrl) localStorage.setItem(OTA_LIVE_URL_STORAGE_KEY, cleanedUrl);
    else localStorage.removeItem(OTA_LIVE_URL_STORAGE_KEY);
  }
  return getGitHubUpdateConfig();
}

export function isRunningInCapacitorOrAndroidWebView(): boolean {
  try {
    const ua = navigator.userAgent || '';
    const hasCap = Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);
    const isWv = ua.includes('; wv)');
    const isCapLocalOrigin =
      (window.location.hostname === 'localhost' ||
        window.location.hostname.endsWith('.localhost')) &&
      window.location.port === '';
    return (
      hasCap ||
      isWv ||
      isCapLocalOrigin ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:'
    );
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function getActiveRunningBuildInfo(): {
  buildId: string;
  commitSha: string;
  buildTimestamp: number;
} {
  const win = window as unknown as {
    __WIZARD_CHESS_ACTIVE_OTA_BUILD__?: {
      buildId?: string;
      commitSha?: string;
      buildTimestamp?: number;
    };
  };
  const activeOta = win.__WIZARD_CHESS_ACTIVE_OTA_BUILD__;
  if (activeOta?.buildId) {
    return {
      buildId: activeOta.buildId,
      commitSha: activeOta.commitSha || COMPILED_COMMIT_SHA,
      buildTimestamp: activeOta.buildTimestamp || COMPILED_BUILD_TIMESTAMP
    };
  }
  return {
    buildId: COMPILED_BUILD_ID,
    commitSha: COMPILED_COMMIT_SHA,
    buildTimestamp: COMPILED_BUILD_TIMESTAMP
  };
}

/**
 * Downloads the complete remote OTA bundle (Manifest + JS Engine + CSS Styles + Static 3D/Icon Assets)
 * with step-by-step progress callbacks, saves to IndexedDB & CacheStorage, and restarts the APK!
 */
export async function downloadChangesAndAssetsWithProgress(
  onProgress?: (update: DownloadProgressUpdate) => void,
  beforeRestart?: () => void,
  details?: DetectedVersionUpdate
): Promise<{ ok: boolean; message: string; bundle?: StoredOtaBundle }> {
  let totalBytes = 0;
  const emit = (
    percent: number,
    stepLabel: string,
    detailLabel: string,
    status: DownloadProgressUpdate['status'] = 'downloading'
  ) => {
    onProgress?.({
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      stepLabel,
      detailLabel,
      downloadedBytes: totalBytes,
      status
    });
  };

  emit(8, 'Step 1/4: Connecting to Update Server...', 'Checking latest version manifest & commit metadata');

  const cfg = getGitHubUpdateConfig();
  const candidateServers = Array.from(
    new Set(
      [
        details?.otaBaseUrl,
        details?.liveUrl,
        cfg.liveUrl,
        DEFAULT_CLOUD_RUN_LIVE_URL,
        window.location.origin.startsWith('http') && !isRunningInCapacitorOrAndroidWebView()
          ? window.location.origin
          : ''
      ].filter((x): x is string => Boolean(x))
    )
  );

  let downloadedBundle: StoredOtaBundle | null = null;

  for (const rawSrv of candidateServers) {
    const cleanSrv = rawSrv.replace(/\/+$/, '');
    const candidateBases = cleanSrv.endsWith('/ota-dist')
      ? [cleanSrv, cleanSrv.replace(/\/ota-dist$/, '')]
      : [`${cleanSrv}/ota-dist`, cleanSrv];

    for (const base of candidateBases) {
      try {
        let entryJs = '';
        let entryCss = '';
        let remoteBuildId = details?.buildId || '';
        let remoteCommitSha = details?.commitSha || '';
        let remoteTimestamp = Date.now();

        const verUrl = base.endsWith('/ota-dist')
          ? `${base.replace(/\/ota-dist$/, '')}/api/version?t=${Date.now()}`
          : `${base}/version.json?t=${Date.now()}`;

        const verRes = await fetch(verUrl, { cache: 'no-store' }).catch(() => null);
        if (verRes && verRes.ok) {
          const ctype = verRes.headers.get('content-type') || '';
          if (ctype.includes('json') || ctype.includes('text/plain')) {
            const vData = await verRes.json().catch(() => null);
            if (vData) {
              if (vData.entryJs) entryJs = String(vData.entryJs);
              if (vData.entryCss) entryCss = String(vData.entryCss);
              if (vData.buildId) remoteBuildId = String(vData.buildId);
              if (vData.commitSha) remoteCommitSha = String(vData.commitSha);
              if (vData.buildTimestamp) remoteTimestamp = Number(vData.buildTimestamp) || remoteTimestamp;
            }
          }
        }

        if (!entryJs) {
          const htmlRes = await fetch(`${base}/index.html?t=${Date.now()}`, {
            cache: 'no-store'
          }).catch(() => null);
          if (htmlRes && htmlRes.ok) {
            const htmlText = await htmlRes.text();
            const jsMatch = htmlText.match(/src=["'](?:\.\/|\/)?(assets\/c-[^"']+\.js)["']/i);
            const cssMatch = htmlText.match(/href=["'](?:\.\/|\/)?(assets\/a-[^"']+\.css)["']/i);
            if (jsMatch) entryJs = jsMatch[1];
            if (cssMatch) entryCss = cssMatch[1];
          }
        }

        if (!entryJs) continue;

        emit(
          28,
          'Step 2/4: Downloading Updated Game Engine & UI...',
          `Fetching ${entryJs} from ${base}`
        );

        const jsRes = await fetch(`${base}/${entryJs.replace(/^\/+/, '')}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!jsRes.ok) continue;
        const jsText = await jsRes.text();
        if (!jsText || jsText.trim().startsWith('<')) continue;
        totalBytes += jsText.length;

        emit(
          62,
          'Step 3/4: Downloading Updated HUD & Layout Styles...',
          entryCss ? `Fetching ${entryCss} (${Math.round(totalBytes / 1024)} KB downloaded)` : 'Verifying stylesheet assets'
        );

        let cssText = '';
        if (entryCss) {
          const cssRes = await fetch(`${base}/${entryCss.replace(/^\/+/, '')}?t=${Date.now()}`, {
            cache: 'no-store'
          }).catch(() => null);
          if (cssRes && cssRes.ok) {
            const rawCss = await cssRes.text();
            if (!rawCss.trim().startsWith('<')) {
              cssText = rawCss;
              totalBytes += cssText.length;
            }
          }
        }

        // Step 4: Pre-fetch & cache core static assets into CacheStorage so offline/3D assets are fresh
        emit(
          84,
          'Step 4/4: Caching 3D Assets & Saving Update to Device...',
          `Saving ${Math.round(totalBytes / 1024)} KB update package to device storage`
        );

        if (typeof caches !== 'undefined') {
          try {
            const assetCache = await caches.open('wizard-chess-assets-v3');
            const staticUrls = [
              `${base}/manifest.json`,
              `${base}/assets/icon-192.svg`,
              `${base}/assets/icon-512.svg`
            ];
            await Promise.allSettled(
              staticUrls.map(async (u) => {
                const r = await fetch(`${u}?t=${Date.now()}`, { cache: 'no-store' });
                if (r.ok) {
                  await assetCache.put(u, r.clone());
                }
              })
            );
          } catch {
            // Optional static cache warm-up
          }
        }

        downloadedBundle = {
          buildId: remoteBuildId || `ota-${Date.now()}`,
          commitSha: remoteCommitSha || 'ota-live',
          buildTimestamp: Math.max(remoteTimestamp, Date.now()),
          baseUrl: base,
          cssText,
          jsText,
          savedAt: Date.now()
        };
        break;
      } catch {
        // Try next candidate
      }
    }
    if (downloadedBundle) break;
  }

  if (!downloadedBundle) {
    emit(
      100,
      'Download Failed — Could Not Fetch Remote Bundle',
      'Make sure your internet connection is active or check your Live OTA URL in Settings.',
      'error'
    );
    return {
      ok: false,
      message: 'Could not download update assets from server. Check your internet connection.'
    };
  }

  // Save bundle to IndexedDB + CacheStorage + localStorage boot flags
  await saveOtaBundleToStorage(downloadedBundle);

  if (beforeRestart) {
    try {
      beforeRestart();
    } catch {}
  }

  emit(
    100,
    'Download Complete (100%)! Restarting APK to Apply Changes...',
    `Saved build ${downloadedBundle.buildId} (${Math.round(totalBytes / 1024)} KB) — Rebooting now...`,
    'restarting'
  );

  // Also apply immediately in-place before triggering the APK restart so both work seamlessly
  await executeHotOtaBundleInPlace(downloadedBundle).catch(() => false);

  window.setTimeout(() => {
    restartApkToApplyChanges();
  }, 950);

  return {
    ok: true,
    message: `Downloaded ${Math.round(totalBytes / 1024)} KB (${downloadedBundle.buildId})! Restarting APK to apply changes...`,
    bundle: downloadedBundle
  };
}

export function registerGameServiceWorkerAndVersionWatcher(
  onNewVersionDetected: (
    newBuildId: string,
    previousBuildId: string,
    details?: DetectedVersionUpdate
  ) => void
): {
  checkForUpdatesNow: (options?: { force?: boolean }) => Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }>;
  applyUpdateAndRefreshState: (
    targetBuildId: string,
    beforeReload?: () => void,
    details?: DetectedVersionUpdate,
    onProgress?: (update: DownloadProgressUpdate) => void
  ) => Promise<void>;
  forcePullAndApplyLatestUpdate: (
    beforeReload?: () => void,
    onProgress?: (update: DownloadProgressUpdate) => void
  ) => Promise<{
    applied: boolean;
    message: string;
  }>;
  getBaselineVersionInfo: () => { buildId: string; commitSha: string };
  dispose: () => void;
} {
  let isDisposed = false;
  let swRegistration: ServiceWorkerRegistration | null = null;

  const notifyUpdate = (details: DetectedVersionUpdate) => {
    if (isDisposed) return;
    onNewVersionDetected(details.buildId, details.previousBuildId, details);
  };

  const seedBundledVersionManifest = async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('application/json') && !ctype.includes('text/plain')) return;
      const manifest = await res.json();
      const validRepo = sanitizeGitHubRepoInput(String(manifest?.githubRepo || ''));
      if (validRepo && !localStorage.getItem(GITHUB_REPO_STORAGE_KEY)) {
        saveGitHubUpdateConfig({
          githubRepo: validRepo,
          branch: sanitizeBranchInput(String(manifest?.branch || 'main')),
          liveUrl: sanitizeLiveUrlInput(String(manifest?.liveUrl || ''))
        });
      }
    } catch {
      // Ignore
    }
  };

  const checkGitHubForUpdates = async (
    force = false
  ): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    const { githubRepo, branch, liveUrl } = getGitHubUpdateConfig();
    if (!githubRepo || !githubRepo.includes('/')) {
      return { found: false, message: '' };
    }

    const activeInfo = getActiveRunningBuildInfo();
    const appliedOtaSha = localStorage.getItem(APPLIED_OTA_COMMIT_SHA_KEY) || '';
    const effectiveRunningSha =
      activeInfo.commitSha && activeInfo.commitSha !== 'local-head'
        ? activeInfo.commitSha
        : appliedOtaSha;

    let shortSha = '';
    let commitMessage = 'New update pushed to GitHub';
    let commitDate = '';

    // 1. Try zero-rate-limit /api/github-version proxy (uses GitHub Atom feed + raw CDN, never 403s)
    const proxyServers = Array.from(
      new Set([liveUrl, DEFAULT_CLOUD_RUN_LIVE_URL].filter(Boolean))
    );
    for (const srv of proxyServers) {
      try {
        const cleanSrv = srv.replace(/\/+$/, '').replace(/\/ota-dist$/, '');
        const proxyRes = await fetch(
          `${cleanSrv}/api/github-version?repo=${encodeURIComponent(githubRepo)}&branch=${encodeURIComponent(branch)}&t=${Date.now()}`,
          { cache: 'no-store' }
        ).catch(() => null);
        if (proxyRes && proxyRes.ok) {
          const pData = await proxyRes.json().catch(() => null);
          if (pData?.ok && pData.shortSha && pData.shortSha !== 'local-head') {
            shortSha = String(pData.shortSha).slice(0, 8);
            if (pData.commitMessage) commitMessage = String(pData.commitMessage);
            if (pData.commitDate) commitDate = String(pData.commitDate);
            break;
          }
        }
      } catch {
        // Continue to next source
      }
    }

    // 2. Try zero-rate-limit raw.githubusercontent.com & cdn.jsdelivr.net
    if (!shortSha) {
      const rawUrls = [
        `https://raw.githubusercontent.com/${githubRepo}/${encodeURIComponent(branch)}/public/version.json?t=${Date.now()}`,
        `https://cdn.jsdelivr.net/gh/${githubRepo}@${encodeURIComponent(branch)}/public/version.json?t=${Date.now()}`
      ];
      for (const rUrl of rawUrls) {
        try {
          const rRes = await fetch(rUrl, { cache: 'no-store' }).catch(() => null);
          if (rRes && rRes.ok) {
            const rData = await rRes.json().catch(() => null);
            const candidateSha = String(rData?.commitSha || rData?.buildId || '');
            if (candidateSha && candidateSha !== 'local-head') {
              shortSha = candidateSha.slice(0, 12);
              if (rData?.notes) commitMessage = String(rData.notes);
              if (rData?.updatedAt) commitDate = String(rData.updatedAt);
              break;
            }
          }
        } catch {
          // Continue
        }
      }
    }

    // 3. Fallback to api.github.com ONLY if needed — and if 403 rate-limited, bypass via Live OTA Server!
    if (!shortSha) {
      try {
        const commitRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/commits/${encodeURIComponent(branch)}?t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: { Accept: 'application/vnd.github.v3+json' }
          }
        );

        if (!commitRes.ok) {
          if (commitRes.status === 403 || commitRes.status === 429) {
            // GitHub REST API rate-limited (60/hr limit per IP) — automatically bypass via Live OTA Server!
            const fallbackBuildId = `ota-bypass-${Date.now()}`;
            const details: DetectedVersionUpdate = {
              buildId: fallbackBuildId,
              previousBuildId: activeInfo.buildId,
              commitMessage: 'GitHub API rate-limit bypassed via Direct Live OTA Server',
              buildTimestamp: Date.now(),
              source: 'live-url',
              liveUrl: liveUrl || DEFAULT_CLOUD_RUN_LIVE_URL,
              otaBaseUrl: `${(liveUrl || DEFAULT_CLOUD_RUN_LIVE_URL).replace(/\/+$/, '')}/ota-dist`
            };
            notifyUpdate(details);
            return {
              found: true,
              message:
                'GitHub API 403 rate-limit bypassed! Tap "⬇ Download Changes & Restart APK" below to download directly from the Live OTA Server.',
              details
            };
          }
          if (commitRes.status === 404) {
            return {
              found: false,
              message: `GitHub repo "${githubRepo}" (branch "${branch}") not found or is private. You can still tap "⬇ Download Changes & Restart APK" to update from the Live Server!`
            };
          }
          return {
            found: false,
            message: `GitHub returned status ${commitRes.status} — tap "⬇ Download Changes & Restart APK" to update directly.`
          };
        }

        const commitData = await commitRes.json();
        const fullSha = typeof commitData?.sha === 'string' ? commitData.sha : '';
        shortSha = fullSha ? fullSha.slice(0, 8) : '';
        if (typeof commitData?.commit?.message === 'string') {
          commitMessage = commitData.commit.message.split('\n')[0].trim();
        }
        if (typeof commitData?.commit?.committer?.date === 'string') {
          commitDate = commitData.commit.committer.date;
        }
      } catch {
        return {
          found: false,
          message: 'Tap "⬇ Download Changes & Restart APK" below to pull the latest assets directly.'
        };
      }
    }

    if (!shortSha) {
      return { found: false, message: '' };
    }

    const commitTs = commitDate ? Date.parse(commitDate) || 0 : 0;
    const remoteBuildId = `gh-${shortSha}`;

    if (force || !effectiveRunningSha || shortSha !== effectiveRunningSha) {
      const details: DetectedVersionUpdate = {
        buildId: remoteBuildId,
        previousBuildId: effectiveRunningSha ? `gh-${effectiveRunningSha}` : activeInfo.buildId,
        commitSha: shortSha,
        commitMessage,
        commitDate,
        buildTimestamp: commitTs || Date.now(),
        source: 'github',
        liveUrl: liveUrl || DEFAULT_CLOUD_RUN_LIVE_URL,
        otaBaseUrl: `https://cdn.jsdelivr.net/gh/${githubRepo}@${shortSha}/dist`,
        releaseHtmlUrl: `https://github.com/${githubRepo}/commits/${branch}`
      };
      notifyUpdate(details);
      return {
        found: true,
        message: `New GitHub update ready! Commit #${shortSha}: "${commitMessage}" — tap "⬇ Download Changes & Restart APK" to apply.`,
        details
      };
    }

    return {
      found: false,
      message: `Synced with GitHub commit #${shortSha} ("${commitMessage}").`
    };
  };

  const checkLiveServersForUpdates = async (
    force = false
  ): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    const { liveUrl } = getGitHubUpdateConfig();
    const candidateServers = Array.from(
      new Set([liveUrl, DEFAULT_CLOUD_RUN_LIVE_URL].filter(Boolean))
    );

    const activeInfo = getActiveRunningBuildInfo();
    const appliedOtaBuildId = localStorage.getItem(APPLIED_OTA_BUILD_ID_KEY) || '';

    for (const srv of candidateServers) {
      try {
        const normalized = srv.replace(/\/+$/, '');
        const endpoints = [
          `${normalized}/api/version?t=${Date.now()}`,
          `${normalized}/version.json?t=${Date.now()}`
        ];
        for (const ep of endpoints) {
          const res = await fetch(ep, { cache: 'no-store' }).catch(() => null);
          if (!res || !res.ok) continue;
          const ctype = res.headers.get('content-type') || '';
          if (!ctype.includes('json') && !ctype.includes('text/plain')) continue;
          const data = await res.json().catch(() => null);
          if (!data || !data.buildId) continue;

          const remoteBuildId = String(data.buildId);
          const remoteTs = Number(data.buildTimestamp) || 0;
          const remoteSha = data.commitSha ? String(data.commitSha) : '';

          const alreadyApplied =
            !force &&
            (remoteBuildId === activeInfo.buildId ||
              remoteBuildId === appliedOtaBuildId ||
              (remoteTs > 0 &&
                activeInfo.buildTimestamp > 0 &&
                remoteTs <= activeInfo.buildTimestamp + 1500));

          if (!alreadyApplied) {
            const details: DetectedVersionUpdate = {
              buildId: remoteBuildId,
              previousBuildId: activeInfo.buildId,
              commitSha: remoteSha || undefined,
              commitMessage: data.notes
                ? String(data.notes)
                : 'New Live OTA Game Update & Assets Ready',
              buildTimestamp: remoteTs || Date.now(),
              source: 'live-url',
              liveUrl: normalized,
              otaBaseUrl: data.otaDistAvailable ? `${normalized}/ota-dist` : normalized,
              entryJs: data.entryJs ? String(data.entryJs) : undefined,
              entryCss: data.entryCss ? String(data.entryCss) : undefined
            };
            notifyUpdate(details);
            return {
              found: true,
              message: `New Update Available (${remoteBuildId})! Tap "⬇ Download Changes & Restart APK" to install.`,
              details
            };
          }
          break;
        }
      } catch {
        // Try next server
      }
    }

    return { found: false, message: '' };
  };

  const checkForUpdatesNow = async (options?: {
    force?: boolean;
  }): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    if (isDisposed) return { found: false, message: '' };
    const force = Boolean(options?.force);

    try {
      if (swRegistration && !isRunningInCapacitorOrAndroidWebView()) {
        await swRegistration.update().catch(() => undefined);
        if (swRegistration.waiting) {
          const swBuildId = 'sw-update-' + Date.now();
          const details: DetectedVersionUpdate = {
            buildId: swBuildId,
            previousBuildId: getActiveRunningBuildInfo().buildId,
            source: 'service-worker',
            commitMessage: 'New Service Worker asset bundle ready'
          };
          notifyUpdate(details);
          return {
            found: true,
            message: 'New Service Worker update ready to download & restart!',
            details
          };
        }
      }

      const liveResult = await checkLiveServersForUpdates(force);
      if (liveResult.found) {
        return liveResult;
      }

      const ghResult = await checkGitHubForUpdates(force);
      if (ghResult.found) {
        return ghResult;
      }

      const activeInfo = getActiveRunningBuildInfo();
      return {
        found: false,
        message:
          ghResult.message ||
          `Active build: ${activeInfo.buildId}. Tap "⬇ Download Changes & Restart APK" below to download the latest assets and restart!`
      };
    } catch {
      return {
        found: false,
        message: 'Tap "⬇ Download Changes & Restart APK" below to download the latest update.'
      };
    }
  };

  const isCapWebView = isRunningInCapacitorOrAndroidWebView();

  seedBundledVersionManifest().finally(() => {
    if (isDisposed) return;
    if ('serviceWorker' in navigator) {
      if (isCapWebView) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            for (const r of regs) {
              r.unregister().catch(() => undefined);
            }
          })
          .catch(() => undefined);
        checkForUpdatesNow();
      } else {
        const onSwMessage = (event: MessageEvent) => {
          const msg = event.data;
          if (!msg || typeof msg.type !== 'string') return;
          if (msg.type === 'NEW_VERSION_AVAILABLE' && msg.buildId) {
            notifyUpdate({
              buildId: String(msg.buildId),
              previousBuildId: getActiveRunningBuildInfo().buildId,
              source: 'service-worker'
            });
          }
        };
        navigator.serviceWorker.addEventListener('message', onSwMessage);

        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then((reg) => {
            if (isDisposed) return;
            swRegistration = reg;

            if (reg.waiting) {
              notifyUpdate({
                buildId: 'sw-waiting-' + Date.now(),
                previousBuildId: getActiveRunningBuildInfo().buildId,
                source: 'service-worker'
              });
            }

            reg.addEventListener('updatefound', () => {
              const installingWorker = reg.installing;
              if (!installingWorker) return;
              installingWorker.addEventListener('statechange', () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  checkForUpdatesNow();
                }
              });
            });

            checkForUpdatesNow();
          })
          .catch(() => {
            checkForUpdatesNow();
          });
      }
    } else {
      checkForUpdatesNow();
    }
  });

  // Poll only the Live OTA Server in the background every 2 minutes (never spam api.github.com!)
  const intervalId = window.setInterval(() => {
    checkLiveServersForUpdates(false);
  }, 120000);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkLiveServersForUpdates(false);
    }
  };
  const handleFocus = () => {
    checkLiveServersForUpdates(false);
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);

  const applyUpdateAndRefreshState = async (
    targetBuildId: string,
    beforeReload?: () => void,
    details?: DetectedVersionUpdate,
    onProgress?: (update: DownloadProgressUpdate) => void
  ): Promise<void> => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PURGE_SHELL_CACHE',
        buildId: targetBuildId
      });
    }

    await downloadChangesAndAssetsWithProgress(onProgress, beforeReload, details);
  };

  const forcePullAndApplyLatestUpdate = async (
    beforeReload?: () => void,
    onProgress?: (update: DownloadProgressUpdate) => void
  ): Promise<{ applied: boolean; message: string }> => {
    localStorage.removeItem(APPLIED_OTA_BUILD_ID_KEY);
    localStorage.removeItem(APPLIED_OTA_COMMIT_SHA_KEY);
    localStorage.removeItem(CACHED_BUILD_ID_STORAGE_KEY);
    localStorage.removeItem(CACHED_COMMIT_SHA_STORAGE_KEY);

    const res = await downloadChangesAndAssetsWithProgress(onProgress, beforeReload);
    return {
      applied: res.ok,
      message: res.message
    };
  };

  return {
    checkForUpdatesNow,
    applyUpdateAndRefreshState,
    forcePullAndApplyLatestUpdate,
    getBaselineVersionInfo: () => {
      const info = getActiveRunningBuildInfo();
      return {
        buildId: info.buildId,
        commitSha: info.commitSha
      };
    },
    dispose: () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    }
  };
}
