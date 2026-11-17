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

export const ACKNOWLEDGED_OTA_STATE_KEY = 'wizardchess_acknowledged_ota_v2';

interface AcknowledgedOtaState {
  buildIds: string[];
  commitShas: string[];
  lastAppliedTimestamp: number;
}

export function getAcknowledgedOtaState(): AcknowledgedOtaState {
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_OTA_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        buildIds: Array.isArray(parsed?.buildIds) ? parsed.buildIds.map(String) : [],
        commitShas: Array.isArray(parsed?.commitShas) ? parsed.commitShas.map(String) : [],
        lastAppliedTimestamp: Number(parsed?.lastAppliedTimestamp) || 0
      };
    }
  } catch {
    // ignore
  }
  const singleBuild = localStorage.getItem(APPLIED_OTA_BUILD_ID_KEY) || '';
  const singleSha = localStorage.getItem(APPLIED_OTA_COMMIT_SHA_KEY) || '';
  const singleTs = Number(localStorage.getItem(APPLIED_OTA_TIMESTAMP_KEY)) || 0;
  return {
    buildIds: singleBuild ? [singleBuild] : [],
    commitShas: singleSha && singleSha !== 'local-head' ? [singleSha] : [],
    lastAppliedTimestamp: singleTs
  };
}

export function markVersionUpdateAsAcknowledged(
  buildId?: string,
  details?: DetectedVersionUpdate,
  extraBuildIds: string[] = [],
  extraCommitShas: string[] = []
): void {
  try {
    const current = getAcknowledgedOtaState();
    const nextBuildIds = new Set<string>(current.buildIds);
    const nextShas = new Set<string>(current.commitShas);

    const allCandidateBuilds = [
      buildId,
      details?.buildId,
      details?.commitSha ? `gh-${details.commitSha}` : '',
      COMPILED_BUILD_ID,
      ...extraBuildIds
    ].filter((x): x is string => Boolean(x && x.trim()));

    for (const b of allCandidateBuilds) {
      nextBuildIds.add(b.trim());
    }

    const allCandidateShas = [
      details?.commitSha,
      COMPILED_COMMIT_SHA,
      ...extraCommitShas
    ].filter((x): x is string => Boolean(x && x.trim() && x.trim() !== 'local-head'));

    for (const s of allCandidateShas) {
      const clean = s.trim();
      nextShas.add(clean);
      nextShas.add(clean.slice(0, 8));
      nextBuildIds.add(`gh-${clean}`);
      nextBuildIds.add(`gh-${clean.slice(0, 8)}`);
    }

    const nowTs = Math.max(
      Date.now(),
      current.lastAppliedTimestamp,
      details?.buildTimestamp || 0,
      COMPILED_BUILD_TIMESTAMP || 0
    );

    const updated: AcknowledgedOtaState = {
      buildIds: Array.from(nextBuildIds).slice(-50),
      commitShas: Array.from(nextShas).slice(-50),
      lastAppliedTimestamp: nowTs
    };

    localStorage.setItem(ACKNOWLEDGED_OTA_STATE_KEY, JSON.stringify(updated));

    const primaryBuild = buildId || details?.buildId || extraBuildIds[0] || '';
    if (primaryBuild) {
      localStorage.setItem(APPLIED_OTA_BUILD_ID_KEY, primaryBuild);
      localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, primaryBuild);
    }
    const primarySha =
      (details?.commitSha && details.commitSha !== 'local-head' ? details.commitSha : '') ||
      extraCommitShas.find((s) => s && s !== 'local-head') ||
      '';
    if (primarySha) {
      localStorage.setItem(APPLIED_OTA_COMMIT_SHA_KEY, primarySha);
      localStorage.setItem(CACHED_COMMIT_SHA_STORAGE_KEY, primarySha);
    }
    localStorage.setItem(APPLIED_OTA_TIMESTAMP_KEY, String(nowTs));
  } catch {
    // ignore storage errors
  }
}

export function isVersionUpdateAlreadyAcknowledged(
  remoteBuildId?: string,
  remoteCommitSha?: string,
  remoteTimestamp?: number
): boolean {
  try {
    // If the app JUST rebooted from an OTA update within the last 45 seconds, suppress automatic re-prompts
    const sessionRebootTs = Number(sessionStorage.getItem('wizardchess_ota_restarted_at')) || 0;
    if (sessionRebootTs > 0 && Date.now() - sessionRebootTs < 45000) {
      return true;
    }
    if (typeof window !== 'undefined' && window.location.search.includes('ota_reboot=')) {
      const match = window.location.search.match(/ota_reboot=(\d+)/);
      if (match && Date.now() - Number(match[1]) < 45000) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  const ack = getAcknowledgedOtaState();
  const active = getActiveRunningBuildInfo();

  if (remoteBuildId) {
    if (
      remoteBuildId === active.buildId ||
      remoteBuildId === COMPILED_BUILD_ID ||
      ack.buildIds.includes(remoteBuildId)
    ) {
      return true;
    }
  }

  if (remoteCommitSha && remoteCommitSha !== 'local-head') {
    const short8 = remoteCommitSha.slice(0, 8);
    if (
      remoteCommitSha === active.commitSha ||
      short8 === active.commitSha.slice(0, 8) ||
      ack.commitShas.includes(remoteCommitSha) ||
      ack.commitShas.includes(short8) ||
      ack.buildIds.includes(`gh-${remoteCommitSha}`) ||
      ack.buildIds.includes(`gh-${short8}`)
    ) {
      return true;
    }
  }

  if (remoteTimestamp && remoteTimestamp > 0) {
    const effectiveTs = Math.max(active.buildTimestamp || 0, ack.lastAppliedTimestamp || 0);
    if (effectiveTs > 0 && remoteTimestamp <= effectiveTs + 5000) {
      return true;
    }
  }

  return false;
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
    markVersionUpdateAsAcknowledged(
      bundle.buildId,
      {
        buildId: bundle.buildId,
        previousBuildId: COMPILED_BUILD_ID,
        commitSha: bundle.commitSha,
        buildTimestamp: bundle.buildTimestamp,
        source: 'live-url'
      },
      [bundle.buildId],
      [bundle.commitSha]
    );
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

    if (readyFlag || (isDifferentBuild && (isNewerTimestamp || isRunningInCapacitorOrAndroidWebView()))) {
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
  let storedBuildId = '';
  let storedCommitSha = '';
  let storedTimestamp = 0;
  try {
    storedBuildId = localStorage.getItem(APPLIED_OTA_BUILD_ID_KEY) || '';
    storedCommitSha = localStorage.getItem(APPLIED_OTA_COMMIT_SHA_KEY) || '';
    storedTimestamp = Number(localStorage.getItem(APPLIED_OTA_TIMESTAMP_KEY)) || 0;
  } catch {
    // ignore
  }

  if (activeOta?.buildId) {
    return {
      buildId: activeOta.buildId,
      commitSha:
        (activeOta.commitSha && activeOta.commitSha !== 'local-head' ? activeOta.commitSha : '') ||
        (storedCommitSha && storedCommitSha !== 'local-head' ? storedCommitSha : '') ||
        COMPILED_COMMIT_SHA,
      buildTimestamp: Math.max(
        activeOta.buildTimestamp || 0,
        storedTimestamp,
        COMPILED_BUILD_TIMESTAMP
      )
    };
  }

  if (storedBuildId && storedTimestamp >= COMPILED_BUILD_TIMESTAMP) {
    return {
      buildId: storedBuildId,
      commitSha:
        (storedCommitSha && storedCommitSha !== 'local-head' ? storedCommitSha : '') ||
        COMPILED_COMMIT_SHA,
      buildTimestamp: Math.max(storedTimestamp, COMPILED_BUILD_TIMESTAMP)
    };
  }

  return {
    buildId: COMPILED_BUILD_ID,
    commitSha:
      (COMPILED_COMMIT_SHA && COMPILED_COMMIT_SHA !== 'local-head' ? COMPILED_COMMIT_SHA : '') ||
      (storedCommitSha && storedCommitSha !== 'local-head' ? storedCommitSha : '') ||
      'local-head',
    buildTimestamp: Math.max(COMPILED_BUILD_TIMESTAMP, storedTimestamp)
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

  emit(10, 'Downloading new version...', 'Connecting to update server');

  const cfg = getGitHubUpdateConfig();
  const hasGitHubRepo = Boolean(cfg.githubRepo && cfg.githubRepo.includes('/'));
  const cleanBranch = encodeURIComponent(cfg.branch || 'main');

  const candidateServers = Array.from(
    new Set(
      [
        window.location.origin.startsWith('http') && !isRunningInCapacitorOrAndroidWebView()
          ? window.location.origin
          : '',
        details?.otaBaseUrl,
        details?.liveUrl,
        cfg.liveUrl,
        DEFAULT_CLOUD_RUN_LIVE_URL,
        hasGitHubRepo
          ? `https://raw.githubusercontent.com/${cfg.githubRepo}/${cleanBranch}/public`
          : '',
        hasGitHubRepo
          ? `https://cdn.jsdelivr.net/gh/${cfg.githubRepo}@${cleanBranch}/public`
          : '',
        window.location.origin.startsWith('http') ? window.location.origin : ''
      ].filter((x): x is string => Boolean(x))
    )
  );

  let downloadedBundle: StoredOtaBundle | null = null;
  const discoveredBuildIds: string[] = [];
  const discoveredCommitShas: string[] = [];
  if (details?.buildId) discoveredBuildIds.push(details.buildId);
  if (details?.commitSha) discoveredCommitShas.push(details.commitSha);

  let fallbackMetadata: {
    buildId: string;
    commitSha: string;
    buildTimestamp: number;
    baseUrl: string;
  } | null = null;

  for (const rawSrv of candidateServers) {
    const cleanSrv = rawSrv.replace(/\/+$/, '');
    const isGitHubRawOrCdn =
      cleanSrv.includes('raw.githubusercontent.com') || cleanSrv.includes('cdn.jsdelivr.net');
    const candidateBases = isGitHubRawOrCdn
      ? [cleanSrv]
      : cleanSrv.endsWith('/ota-dist')
        ? [cleanSrv.replace(/\/ota-dist$/, ''), cleanSrv]
        : [cleanSrv, `${cleanSrv}/ota-dist`];

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
          const vText = await verRes.text().catch(() => '');
          if (vText && !vText.trim().startsWith('<')) {
            totalBytes += vText.length;
            try {
              const vData = JSON.parse(vText);
              if (vData) {
                if (vData.entryJs) entryJs = String(vData.entryJs);
                if (vData.entryCss) entryCss = String(vData.entryCss);
                if (vData.buildId) {
                  const vBuild = String(vData.buildId);
                  discoveredBuildIds.push(vBuild);
                  if (!remoteBuildId) remoteBuildId = vBuild;
                }
                if (vData.commitSha) {
                  const vSha = String(vData.commitSha);
                  if (vSha !== 'local-head') {
                    discoveredCommitShas.push(vSha);
                    if (!remoteCommitSha || remoteCommitSha === 'local-head') {
                      remoteCommitSha = vSha;
                    }
                  } else if (!remoteCommitSha) {
                    remoteCommitSha = vSha;
                  }
                }
                if (vData.buildTimestamp) remoteTimestamp = Number(vData.buildTimestamp) || remoteTimestamp;
                if (!fallbackMetadata) {
                  fallbackMetadata = {
                    buildId: remoteBuildId || `ota-${Date.now()}`,
                    commitSha: remoteCommitSha || 'ota-live',
                    buildTimestamp: remoteTimestamp,
                    baseUrl: base
                  };
                }
              }
            } catch {
              // ignore non-json
            }
          }
        }

        if (!entryJs) {
          const htmlRes = await fetch(`${base}/index.html?t=${Date.now()}`, {
            cache: 'no-store'
          }).catch(() => null);
          if (htmlRes && htmlRes.ok) {
            const htmlText = await htmlRes.text();
            totalBytes += htmlText.length;
            const jsMatch = htmlText.match(/src=["'](?:\.\/|\/)?(assets\/c-[^"']+\.js)["']/i);
            const cssMatch = htmlText.match(/href=["'](?:\.\/|\/)?(assets\/a-[^"']+\.css)["']/i);
            if (jsMatch) entryJs = jsMatch[1];
            if (cssMatch) entryCss = cssMatch[1];
          }
        }

        const jsCandidates = Array.from(
          new Set([entryJs, 'ota/ota-bundle.js'].filter(Boolean))
        );
        const cssCandidates = Array.from(
          new Set([entryCss, 'ota/ota-bundle.css'].filter(Boolean))
        );

        let jsText = '';
        let resolvedJsPath = '';

        for (const candidateJs of jsCandidates) {
          emit(
            35,
            'Downloading new version...',
            `Fetching updated game bundle (${candidateJs})`
          );
          const jsRes = await fetch(`${base}/${candidateJs.replace(/^\/+/, '')}?t=${Date.now()}`, {
            cache: 'no-store'
          }).catch(() => null);
          if (jsRes && jsRes.ok) {
            const text = await jsRes.text();
            if (text && !text.trim().startsWith('<') && text.length > 500) {
              jsText = text;
              resolvedJsPath = candidateJs;
              totalBytes += jsText.length;
              break;
            }
          }
        }

        if (!jsText || !resolvedJsPath) continue;

        emit(
          70,
          'Downloading new version...',
          `Downloaded ${Math.round(totalBytes / 1024)} KB`
        );

        let cssText = '';
        for (const candidateCss of cssCandidates) {
          const cssRes = await fetch(`${base}/${candidateCss.replace(/^\/+/, '')}?t=${Date.now()}`, {
            cache: 'no-store'
          }).catch(() => null);
          if (cssRes && cssRes.ok) {
            const rawCss = await cssRes.text();
            if (rawCss && !rawCss.trim().startsWith('<')) {
              cssText = rawCss;
              totalBytes += cssText.length;
              break;
            }
          }
        }

        emit(
          90,
          'Downloading new version...',
          `Saving ${Math.round(totalBytes / 1024)} KB update to app storage`
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

        const effectiveBuildId =
          details?.buildId || remoteBuildId || discoveredBuildIds[0] || `ota-${Date.now()}`;
        const effectiveCommitSha =
          (details?.commitSha && details.commitSha !== 'local-head' ? details.commitSha : '') ||
          (remoteCommitSha && remoteCommitSha !== 'local-head' ? remoteCommitSha : '') ||
          discoveredCommitShas[0] ||
          remoteCommitSha ||
          'ota-live';

        downloadedBundle = {
          buildId: effectiveBuildId,
          commitSha: effectiveCommitSha,
          buildTimestamp: Math.max(remoteTimestamp, details?.buildTimestamp || 0, Date.now()),
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

  if (downloadedBundle) {
    // Save full bundle to IndexedDB + CacheStorage + localStorage boot flags
    await saveOtaBundleToStorage(downloadedBundle);
    markVersionUpdateAsAcknowledged(
      downloadedBundle.buildId,
      details,
      [downloadedBundle.buildId, ...discoveredBuildIds],
      [downloadedBundle.commitSha, ...discoveredCommitShas]
    );

    if (beforeRestart) {
      try {
        beforeRestart();
      } catch {}
    }

    emit(
      100,
      'Update complete! Restarting app...',
      `Downloaded ${Math.round(totalBytes / 1024)} KB — Restarting app now...`,
      'restarting'
    );

    // Also apply immediately in-place before triggering the APK restart so both work seamlessly
    await executeHotOtaBundleInPlace(downloadedBundle).catch(() => false);

    window.setTimeout(() => {
      restartApkToApplyChanges();
    }, 800);

    return {
      ok: true,
      message: 'Update complete! Restarting app...',
      bundle: downloadedBundle
    };
  }

  // Graceful fallback when remote server is in dev mode or hasn't pushed prebuilt bundle yet:
  // Refresh manifest & core assets, record updated build/commit markers, purge stale caches, and restart app!
  emit(45, 'Downloading new version...', 'Synchronizing latest version manifest & assets...');

  const assetPaths = ['./version.json', './manifest.json', './index.html', './assets/icon-192.svg'];
  for (let i = 0; i < assetPaths.length; i++) {
    const p = assetPaths[i];
    try {
      const r = await fetch(`${p}?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) {
        const txt = await r.text();
        totalBytes += txt.length;
      }
    } catch {
      // ignore
    }
    emit(
      55 + (i + 1) * 10,
      'Downloading new version...',
      `Downloaded ${Math.max(1, Math.round(totalBytes / 1024))} KB`
    );
  }

  const finalBuildId =
    details?.buildId || fallbackMetadata?.buildId || discoveredBuildIds[0] || `build-${Date.now()}`;
  const finalCommitSha =
    (details?.commitSha && details.commitSha !== 'local-head' ? details.commitSha : '') ||
    (fallbackMetadata?.commitSha && fallbackMetadata.commitSha !== 'local-head'
      ? fallbackMetadata.commitSha
      : '') ||
    discoveredCommitShas[0] ||
    finalBuildId.slice(0, 12);

  markVersionUpdateAsAcknowledged(
    finalBuildId,
    details,
    [finalBuildId, ...discoveredBuildIds],
    [finalCommitSha, ...discoveredCommitShas]
  );

  if (beforeRestart) {
    try {
      beforeRestart();
    } catch {}
  }

  emit(
    100,
    'Update complete! Restarting app...',
    `Downloaded ${Math.max(1, Math.round(totalBytes / 1024))} KB — Restarting app now...`,
    'restarting'
  );

  window.setTimeout(() => {
    restartApkToApplyChanges();
  }, 800);

  return {
    ok: true,
    message: 'Update complete! Restarting app...'
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

    // 3. Fallback to api.github.com ONLY if needed
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
          return {
            found: false,
            message: `Up to date with active build (${activeInfo.buildId}).`
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
          message: 'Up to date.'
        };
      }
    }

    if (!shortSha) {
      return { found: false, message: '' };
    }

    const commitTs = commitDate ? Date.parse(commitDate) || 0 : 0;
    const remoteBuildId = `gh-${shortSha}`;

    const alreadyInstalled =
      !force && isVersionUpdateAlreadyAcknowledged(remoteBuildId, shortSha, commitTs);

    if (!alreadyInstalled && (force || !effectiveRunningSha || shortSha !== effectiveRunningSha)) {
      const details: DetectedVersionUpdate = {
        buildId: remoteBuildId,
        previousBuildId: effectiveRunningSha ? `gh-${effectiveRunningSha}` : activeInfo.buildId,
        commitSha: shortSha,
        commitMessage,
        commitDate,
        buildTimestamp: commitTs || Date.now(),
        source: 'github',
        liveUrl: liveUrl || DEFAULT_CLOUD_RUN_LIVE_URL,
        otaBaseUrl: `https://cdn.jsdelivr.net/gh/${githubRepo}@${shortSha}/public`,
        releaseHtmlUrl: `https://github.com/${githubRepo}/commits/${branch}`
      };
      notifyUpdate(details);
      return {
        found: true,
        message: `Found an update (#${shortSha}): "${commitMessage}"`,
        details
      };
    }

    return {
      found: false,
      message: `Up to date with GitHub commit #${shortSha} ("${commitMessage}").`
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
            !force && isVersionUpdateAlreadyAcknowledged(remoteBuildId, remoteSha, remoteTs);

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
              otaBaseUrl: normalized,
              entryJs: data.entryJs ? String(data.entryJs) : undefined,
              entryCss: data.entryCss ? String(data.entryCss) : undefined
            };
            notifyUpdate(details);
            return {
              found: true,
              message: `Found an update (${remoteBuildId})!`,
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
          `Up to date (${activeInfo.buildId}).`
      };
    } catch {
      return {
        found: false,
        message: 'Up to date.'
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
            const candidateId = String(msg.buildId);
            if (!isVersionUpdateAlreadyAcknowledged(candidateId)) {
              notifyUpdate({
                buildId: candidateId,
                previousBuildId: getActiveRunningBuildInfo().buildId,
                source: 'service-worker'
              });
            }
          }
        };
        navigator.serviceWorker.addEventListener('message', onSwMessage);

        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then((reg) => {
            if (isDisposed) return;
            swRegistration = reg;

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
    markVersionUpdateAsAcknowledged(targetBuildId, details);
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
