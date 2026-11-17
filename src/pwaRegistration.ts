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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const OTA_IDB_NAME = 'wizardchess_ota_db_v1';
const OTA_IDB_STORE = 'bundles';
const OTA_IDB_KEY = 'active_bundle';

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

export async function saveOtaBundleToIndexedDB(bundle: StoredOtaBundle): Promise<boolean> {
  const db = await openOtaIndexedDB();
  if (!db) return false;
  return new Promise((resolve) => {
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

export async function loadOtaBundleFromIndexedDB(): Promise<StoredOtaBundle | null> {
  const db = await openOtaIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
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
    win.__WIZARD_CHESS_ACTIVE_OTA_BUILD__ = {
      buildId: bundle.buildId,
      commitSha: bundle.commitSha,
      buildTimestamp: bundle.buildTimestamp
    };

    localStorage.setItem(APPLIED_OTA_BUILD_ID_KEY, bundle.buildId);
    if (bundle.commitSha) {
      localStorage.setItem(APPLIED_OTA_COMMIT_SHA_KEY, bundle.commitSha);
    }
    if (bundle.buildTimestamp) {
      localStorage.setItem(APPLIED_OTA_TIMESTAMP_KEY, String(bundle.buildTimestamp));
    }

    // Inject updated CSS
    if (bundle.cssText) {
      let styleEl = document.getElementById('wizardchess-ota-live-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'wizardchess-ota-live-style';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = rewriteBundleRelativeAssets(bundle.cssText, bundle.baseUrl);
    }

    // Clean up existing 3D canvas / UI overlays before mounting new bundle
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
 * Called at startup in src/main.tsx: if running inside the Capacitor Android APK
 * and IndexedDB has a hot-downloaded OTA bundle that is strictly newer than the
 * APK's baked-in compile timestamp, execute the newer OTA bundle automatically!
 */
export async function bootInstalledOtaBundleIfNewer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as Record<string, unknown>;
  if (win.__WIZARD_CHESS_OTA_BOOTING__) return false;
  if (!isRunningInCapacitorOrAndroidWebView()) return false;

  try {
    const cached = await loadOtaBundleFromIndexedDB();
    if (!cached || !cached.jsText) return false;
    const isNewerTimestamp =
      cached.buildTimestamp > 0 &&
      COMPILED_BUILD_TIMESTAMP > 0 &&
      cached.buildTimestamp > COMPILED_BUILD_TIMESTAMP + 2000;
    const isDifferentBuild = cached.buildId && cached.buildId !== COMPILED_BUILD_ID;
    if (isNewerTimestamp && isDifferentBuild) {
      win.__WIZARD_CHESS_OTA_BOOTING__ = true;
      const ok = await executeHotOtaBundleInPlace(cached);
      if (ok) return true;
      win.__WIZARD_CHESS_OTA_BOOTING__ = false;
    }
  } catch {
    // Fall back to baked-in bundle
  }
  return false;
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

/**
 * Clean up any legacy placeholder strings in localStorage and return valid config
 */
export function getGitHubUpdateConfig(): GitHubUpdateConfig {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const rawStoredRepo = localStorage.getItem(GITHUB_REPO_STORAGE_KEY) || '';
  const rawStoredBranch = localStorage.getItem(GITHUB_BRANCH_STORAGE_KEY) || '';
  const rawStoredLiveUrl = localStorage.getItem(OTA_LIVE_URL_STORAGE_KEY) || '';

  // Purge accidental Jemz1/Jemz2/Jemz3 placeholders if present in localStorage
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

/**
 * Returns the TRUE currently executing build metadata in memory (either the compiled
 * JS bundle or a hot-injected OTA bundle that is currently active in memory).
 */
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
 * Try downloading a complete compiled OTA bundle (CSS + JS) from a candidate server URL
 * (such as Cloud Run /ota-dist, GitHub Pages, or jsDelivr GitHub CDN)
 */
async function fetchRemoteOtaBundleFromServer(
  serverBaseUrl: string,
  expectedBuildId?: string,
  expectedCommitSha?: string
): Promise<StoredOtaBundle | null> {
  const cleanBase = serverBaseUrl.replace(/\/+$/, '');
  const candidateBases = cleanBase.endsWith('/ota-dist')
    ? [cleanBase, cleanBase.replace(/\/ota-dist$/, '')]
    : [`${cleanBase}/ota-dist`, cleanBase];

  for (const base of candidateBases) {
    try {
      // 1. Check if /api/version or /version.json provides entryJs & entryCss
      let entryJs = '';
      let entryCss = '';
      let remoteBuildId = expectedBuildId || '';
      let remoteCommitSha = expectedCommitSha || '';
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

      // 2. If entryJs was not in version.json, parse index.html from base
      if (!entryJs) {
        const htmlRes = await fetch(`${base}/index.html?t=${Date.now()}`, { cache: 'no-store' }).catch(
          () => null
        );
        if (htmlRes && htmlRes.ok) {
          const htmlText = await htmlRes.text();
          const jsMatch = htmlText.match(/src=["'](?:\.\/|\/)?(assets\/c-[^"']+\.js)["']/i);
          const cssMatch = htmlText.match(/href=["'](?:\.\/|\/)?(assets\/a-[^"']+\.css)["']/i);
          if (jsMatch) entryJs = jsMatch[1];
          if (cssMatch) entryCss = cssMatch[1];
        }
      }

      if (!entryJs) continue;

      const jsRes = await fetch(`${base}/${entryJs.replace(/^\/+/, '')}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!jsRes.ok) continue;
      const jsText = await jsRes.text();
      if (!jsText || jsText.trim().startsWith('<')) continue;

      let cssText = '';
      if (entryCss) {
        const cssRes = await fetch(`${base}/${entryCss.replace(/^\/+/, '')}?t=${Date.now()}`, {
          cache: 'no-store'
        }).catch(() => null);
        if (cssRes && cssRes.ok) {
          const rawCss = await cssRes.text();
          if (!rawCss.trim().startsWith('<')) {
            cssText = rawCss;
          }
        }
      }

      return {
        buildId: remoteBuildId || `ota-${Date.now()}`,
        commitSha: remoteCommitSha || 'ota-live',
        buildTimestamp: remoteTimestamp,
        baseUrl: base,
        cssText,
        jsText,
        savedAt: Date.now()
      };
    } catch {
      // Try next candidate base
    }
  }
  return null;
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
    details?: DetectedVersionUpdate
  ) => Promise<void>;
  forcePullAndApplyLatestUpdate: (beforeReload?: () => void) => Promise<{
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

  // Seed bundled version.json only if valid (never overwrite with Jemz1/Jemz2/Jemz3 placeholders)
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

  // 1. Check GitHub Repository Commits & Releases
  const checkGitHubForUpdates = async (
    force = false
  ): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    const { githubRepo, branch, liveUrl } = getGitHubUpdateConfig();
    if (!githubRepo || !githubRepo.includes('/')) {
      return {
        found: false,
        message: ''
      };
    }

    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/commits/${encodeURIComponent(branch)}?t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github.v3+json' }
        }
      );

      if (!commitRes.ok) {
        if (commitRes.status === 404) {
          return {
            found: false,
            message: `GitHub repo "${githubRepo}" (branch "${branch}") not found or is private.`
          };
        }
        return {
          found: false,
          message: `GitHub API returned status ${commitRes.status}.`
        };
      }

      const commitData = await commitRes.json();
      const fullSha = typeof commitData?.sha === 'string' ? commitData.sha : '';
      const shortSha = fullSha ? fullSha.slice(0, 8) : '';
      const commitMessage =
        typeof commitData?.commit?.message === 'string'
          ? commitData.commit.message.split('\n')[0].trim()
          : 'New commit pushed to GitHub';
      const commitDate =
        typeof commitData?.commit?.committer?.date === 'string'
          ? commitData.commit.committer.date
          : '';
      const commitTs = commitDate ? Date.parse(commitDate) || 0 : 0;

      if (!shortSha) {
        return { found: false, message: 'Could not read commit SHA from GitHub.' };
      }

      let apkDownloadUrl = '';
      let releaseHtmlUrl = '';
      try {
        const relRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/releases/latest?t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: { Accept: 'application/vnd.github.v3+json' }
          }
        );
        if (relRes.ok) {
          const relData = await relRes.json();
          if (typeof relData?.html_url === 'string') {
            releaseHtmlUrl = relData.html_url;
          }
          if (Array.isArray(relData?.assets)) {
            const apkAsset = relData.assets.find(
              (a: { name?: string; browser_download_url?: string }) =>
                typeof a?.name === 'string' &&
                a.name.toLowerCase().endsWith('.apk') &&
                typeof a?.browser_download_url === 'string'
            );
            if (apkAsset?.browser_download_url) {
              apkDownloadUrl = apkAsset.browser_download_url;
            }
          }
        }
      } catch {
        // Optional release check
      }

      const activeInfo = getActiveRunningBuildInfo();
      const appliedOtaSha = localStorage.getItem(APPLIED_OTA_COMMIT_SHA_KEY) || '';
      const effectiveRunningSha =
        activeInfo.commitSha && activeInfo.commitSha !== 'local-head'
          ? activeInfo.commitSha
          : appliedOtaSha;

      const remoteBuildId = `gh-${shortSha}`;

      // Notice: Do NOT silently overwrite localStorage when effectiveRunningSha is empty/local-head!
      // If the APK was built with 'local-head' or an older SHA, treat any mismatched GitHub commit as an update!
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
          apkDownloadUrl: apkDownloadUrl || undefined,
          releaseHtmlUrl: releaseHtmlUrl || `https://github.com/${githubRepo}/commits/${branch}`
        };
        notifyUpdate(details);
        return {
          found: true,
          message: `New GitHub update ready! Commit #${shortSha}: "${commitMessage}" — tap Update Now to apply.`,
          details
        };
      }

      return {
        found: false,
        message: `Running latest GitHub commit #${shortSha} ("${commitMessage}").`
      };
    } catch {
      return {
        found: false,
        message: 'Could not reach GitHub API. Checking Live OTA Server...'
      };
    }
  };

  // 2. Check Remote Live OTA Server (both user's configured liveUrl AND Cloud Run Shared App URL)
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
        // Try /api/version first, then /version.json
        const endpoints = [`${normalized}/api/version?t=${Date.now()}`, `${normalized}/version.json?t=${Date.now()}`];
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
              commitMessage:
                data.notes ? String(data.notes) : 'New Live OTA Game Update Ready',
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
              message: `New Live Update detected (${remoteBuildId})! Tap "Update & Reload Now" to apply immediately.`,
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

  // Combined Version Check (Service Worker + GitHub + Cloud Run / Live OTA Server)
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
      // 1. Check Service Worker waiting state on Web
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
            message: 'New Service Worker update ready to apply!',
            details
          };
        }
      }

      // 2. Check Live OTA Servers (Cloud Run Shared App URL + GitHub Pages) — works inside APK & Web!
      const liveResult = await checkLiveServersForUpdates(force);
      if (liveResult.found) {
        return liveResult;
      }

      // 3. Check GitHub Repository API (if user configured a GitHub repo)
      const ghResult = await checkGitHubForUpdates(force);
      if (ghResult.found) {
        return ghResult;
      }

      const activeInfo = getActiveRunningBuildInfo();
      return {
        found: false,
        message:
          ghResult.message ||
          `Running latest build (${activeInfo.buildId}). Tap "Force Apply Latest Update" anytime to hot-reload the live server bundle!`
      };
    } catch {
      return {
        found: false,
        message: 'Unable to check for updates right now.'
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

  const intervalId = window.setInterval(() => {
    checkForUpdatesNow();
  }, 30000);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdatesNow();
    }
  };
  const handleFocus = () => {
    checkForUpdatesNow();
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);

  const applyUpdateAndRefreshState = async (
    targetBuildId: string,
    beforeReload?: () => void,
    details?: DetectedVersionUpdate
  ): Promise<void> => {
    try {
      if (beforeReload) {
        beforeReload();
      }

      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      if (navigator.serviceWorker?.controller) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 450);
          const handler = (ev: MessageEvent) => {
            if (ev.data?.type === 'SHELL_CACHE_PURGED') {
              window.clearTimeout(timeout);
              navigator.serviceWorker.removeEventListener('message', handler);
              resolve();
            }
          };
          navigator.serviceWorker.addEventListener('message', handler);
          navigator.serviceWorker.controller?.postMessage({
            type: 'PURGE_SHELL_CACHE',
            buildId: targetBuildId
          });
        });
      }

      // Try hot-downloading and executing the remote OTA bundle in-place (essential for Android APK!)
      const cfg = getGitHubUpdateConfig();
      const candidateBases = Array.from(
        new Set(
          [
            details?.otaBaseUrl,
            details?.liveUrl,
            cfg.liveUrl,
            DEFAULT_CLOUD_RUN_LIVE_URL
          ].filter((x): x is string => Boolean(x))
        )
      );

      for (const base of candidateBases) {
        const bundle = await fetchRemoteOtaBundleFromServer(
          base,
          details?.buildId || targetBuildId,
          details?.commitSha
        );
        if (bundle) {
          await saveOtaBundleToIndexedDB(bundle);
          const executed = await executeHotOtaBundleInPlace(bundle);
          if (executed) {
            return;
          }
        }
      }
    } catch {
      // Fallback to reload
    }

    window.location.reload();
  };

  const forcePullAndApplyLatestUpdate = async (
    beforeReload?: () => void
  ): Promise<{ applied: boolean; message: string }> => {
    try {
      if (beforeReload) beforeReload();
      localStorage.removeItem(APPLIED_OTA_BUILD_ID_KEY);
      localStorage.removeItem(APPLIED_OTA_COMMIT_SHA_KEY);
      localStorage.removeItem(CACHED_BUILD_ID_STORAGE_KEY);
      localStorage.removeItem(CACHED_COMMIT_SHA_STORAGE_KEY);

      const cfg = getGitHubUpdateConfig();
      const candidateBases = Array.from(
        new Set([cfg.liveUrl, DEFAULT_CLOUD_RUN_LIVE_URL].filter(Boolean))
      );

      for (const base of candidateBases) {
        const bundle = await fetchRemoteOtaBundleFromServer(base);
        if (bundle) {
          await saveOtaBundleToIndexedDB(bundle);
          const executed = await executeHotOtaBundleInPlace(bundle);
          if (executed) {
            return {
              applied: true,
              message: `Successfully pulled & applied live update (${bundle.buildId})!`
            };
          }
        }
      }

      window.location.reload();
      return {
        applied: true,
        message: 'Reloading with latest server assets...'
      };
    } catch {
      return {
        applied: false,
        message: 'Could not reach the Live OTA Server. Check your internet connection.'
      };
    }
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
