import { useEffect, useState } from 'react';

export const CACHED_BUILD_ID_STORAGE_KEY = 'wizardchess_cached_build_id';
export const CACHED_COMMIT_SHA_STORAGE_KEY = 'wizardchess_cached_commit_sha';
export const GITHUB_REPO_STORAGE_KEY = 'wizardchess_github_repo';
export const GITHUB_BRANCH_STORAGE_KEY = 'wizardchess_github_branch';
export const OTA_LIVE_URL_STORAGE_KEY = 'wizardchess_ota_live_url';

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
  source: 'github' | 'live-url' | 'server' | 'service-worker';
  liveUrl?: string;
  apkDownloadUrl?: string;
  releaseHtmlUrl?: string;
}

export interface VersionUpdateState {
  available: boolean;
  newBuildId: string;
  currentBuildId: string;
  checking: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Helper to read/write GitHub Auto-Update configuration from localStorage / env
 */
export function getGitHubUpdateConfig(): GitHubUpdateConfig {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const storedRepo = (localStorage.getItem(GITHUB_REPO_STORAGE_KEY) || '').trim();
  const storedBranch = (localStorage.getItem(GITHUB_BRANCH_STORAGE_KEY) || '').trim();
  const storedLiveUrl = (localStorage.getItem(OTA_LIVE_URL_STORAGE_KEY) || '').trim();

  const githubRepo = sanitizeGitHubRepoInput(storedRepo || env.VITE_GITHUB_REPO || '');
  const branch = storedBranch || env.VITE_GITHUB_BRANCH || 'main';
  let liveUrl = storedLiveUrl || env.VITE_OTA_LIVE_URL || '';

  if (!liveUrl && githubRepo.includes('/')) {
    const [owner, repo] = githubRepo.split('/');
    if (owner && repo) {
      liveUrl = `https://${owner}.github.io/${repo}/`;
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
    const cleanedBranch = cfg.branch.trim() || 'main';
    localStorage.setItem(GITHUB_BRANCH_STORAGE_KEY, cleanedBranch);
  }
  if (cfg.liveUrl !== undefined) {
    const cleanedUrl = cfg.liveUrl.trim();
    if (cleanedUrl) localStorage.setItem(OTA_LIVE_URL_STORAGE_KEY, cleanedUrl);
    else localStorage.removeItem(OTA_LIVE_URL_STORAGE_KEY);
  }
  return getGitHubUpdateConfig();
}

export function sanitizeGitHubRepoInput(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  // Accept full GitHub URLs like https://github.com/owner/repo or https://github.com/owner/repo.git
  const urlMatch = trimmed.match(/github\.com[:/]([^/]+\/[^/#?]+?)(?:\.git|\/)?$/i);
  if (urlMatch) return urlMatch[1];
  // Accept "owner/repo"
  const pairMatch = trimmed.match(/^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/);
  if (pairMatch) return pairMatch[1];
  return trimmed;
}

/**
 * Detect whether we are running inside a native Android Capacitor WebView
 */
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

/**
 * Hook for in-app PWA installation prompt (Android / Chromium & iOS Safari guide)
 */
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

/**
 * Hook for tracking online/offline status
 */
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
 * Registers the Service Worker (`/sw.js`), loads bundled `./version.json`, and checks:
 * 1. GitHub Repository Commits & Releases API (`api.github.com/repos/<owner>/<repo>/commits/<branch>`)
 * 2. Remote Live OTA URL (`<liveUrl>/version.json`)
 * 3. Same-origin `/api/version` & Service Worker updates
 * Calls `onNewVersionDetected` when a new commit, build, or waiting SW is found.
 */
export function registerGameServiceWorkerAndVersionWatcher(
  onNewVersionDetected: (
    newBuildId: string,
    previousBuildId: string,
    details?: DetectedVersionUpdate
  ) => void
): {
  checkForUpdatesNow: () => Promise<{ found: boolean; message: string; details?: DetectedVersionUpdate }>;
  applyUpdateAndRefreshState: (
    targetBuildId: string,
    beforeReload?: () => void,
    details?: DetectedVersionUpdate
  ) => Promise<void>;
  getBaselineVersionInfo: () => { buildId: string; commitSha: string };
  dispose: () => void;
} {
  let isDisposed = false;
  let swRegistration: ServiceWorkerRegistration | null = null;
  let sessionBaselineBuildId: string =
    localStorage.getItem(CACHED_BUILD_ID_STORAGE_KEY) || '';
  let sessionBaselineCommitSha: string =
    localStorage.getItem(CACHED_COMMIT_SHA_STORAGE_KEY) || '';

  const notifyUpdate = (details: DetectedVersionUpdate) => {
    if (isDisposed) return;
    onNewVersionDetected(details.buildId, details.previousBuildId, details);
  };

  // Seed baseline version info from bundled ./version.json (works inside Capacitor APK & Web)
  const seedBundledVersionManifest = async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('application/json') && !ctype.includes('text/plain')) return;
      const manifest = await res.json();
      if (manifest?.githubRepo && !localStorage.getItem(GITHUB_REPO_STORAGE_KEY)) {
        saveGitHubUpdateConfig({
          githubRepo: String(manifest.githubRepo),
          branch: manifest.branch ? String(manifest.branch) : 'main',
          liveUrl: manifest.liveUrl ? String(manifest.liveUrl) : ''
        });
      }
      if (manifest?.buildId && !sessionBaselineBuildId) {
        sessionBaselineBuildId = String(manifest.buildId);
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, sessionBaselineBuildId);
      }
      if (manifest?.commitSha && !sessionBaselineCommitSha) {
        sessionBaselineCommitSha = String(manifest.commitSha);
        localStorage.setItem(CACHED_COMMIT_SHA_STORAGE_KEY, sessionBaselineCommitSha);
      }
    } catch {
      // Ignore if local manifest not present
    }
  };

  // Check GitHub Commits, Raw version.json, and Latest Release APK
  const checkGitHubForUpdates = async (): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    const { githubRepo, branch, liveUrl } = getGitHubUpdateConfig();
    if (!githubRepo || !githubRepo.includes('/')) {
      return {
        found: false,
        message: 'No GitHub repository configured yet.'
      };
    }

    try {
      // 1. Fetch latest commit on the configured branch from GitHub REST API
      const commitRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/commits/${encodeURIComponent(branch)}?t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/vnd.github.v3+json'
          }
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

      if (!shortSha) {
        return { found: false, message: 'Could not read commit SHA from GitHub.' };
      }

      // 2. Optionally check Latest GitHub Release for an attached .apk download link
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

      const storedSha = localStorage.getItem(CACHED_COMMIT_SHA_STORAGE_KEY) || '';
      const baselineSha =
        sessionBaselineCommitSha && sessionBaselineCommitSha !== 'local-head'
          ? sessionBaselineCommitSha
          : storedSha && storedSha !== 'local-head'
            ? storedSha
            : '';

      const remoteBuildId = `gh-${shortSha}`;

      // First time connecting this GitHub repo: if baseline was 'local-head' or empty,
      // check if raw version.json buildId differs or treat a new commit on GitHub as an update
      // if the user already had a stored SHA.
      if (!baselineSha) {
        sessionBaselineCommitSha = shortSha;
        localStorage.setItem(CACHED_COMMIT_SHA_STORAGE_KEY, shortSha);
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, remoteBuildId);
        return {
          found: false,
          message: `Connected to GitHub (${githubRepo}@${branch}) — synced at commit #${shortSha} ("${commitMessage}"). Future pushes to GitHub will trigger Auto-Update!`
        };
      }

      if (shortSha !== baselineSha) {
        const details: DetectedVersionUpdate = {
          buildId: remoteBuildId,
          previousBuildId: `gh-${baselineSha}`,
          commitSha: shortSha,
          commitMessage,
          commitDate,
          source: 'github',
          liveUrl: liveUrl || undefined,
          apkDownloadUrl: apkDownloadUrl || undefined,
          releaseHtmlUrl: releaseHtmlUrl || `https://github.com/${githubRepo}/commits/${branch}`
        };
        notifyUpdate(details);
        return {
          found: true,
          message: `New GitHub update found! Commit #${shortSha}: "${commitMessage}"`,
          details
        };
      }

      return {
        found: false,
        message: `Up to date with GitHub (${githubRepo}@${branch}) at commit #${shortSha} ("${commitMessage}").`
      };
    } catch {
      return {
        found: false,
        message: 'Could not reach GitHub API. Check your internet connection.'
      };
    }
  };

  // Check remote Live OTA URL (e.g., GitHub Pages or deployed server)
  const checkLiveUrlForUpdates = async (): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    const { liveUrl } = getGitHubUpdateConfig();
    if (!liveUrl) {
      return { found: false, message: '' };
    }
    try {
      const normalized = liveUrl.replace(/\/+$/, '');
      const res = await fetch(`${normalized}/version.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!res.ok) return { found: false, message: '' };
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('application/json') && !ctype.includes('text/plain')) {
        return { found: false, message: '' };
      }
      const data = await res.json();
      const remoteBuildId = data?.buildId ? String(data.buildId) : '';
      const remoteSha = data?.commitSha ? String(data.commitSha) : '';
      if (!remoteBuildId) return { found: false, message: '' };

      if (!sessionBaselineBuildId) {
        sessionBaselineBuildId = remoteBuildId;
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, remoteBuildId);
        return { found: false, message: '' };
      }

      if (remoteBuildId !== sessionBaselineBuildId) {
        const details: DetectedVersionUpdate = {
          buildId: remoteBuildId,
          previousBuildId: sessionBaselineBuildId,
          commitSha: remoteSha || undefined,
          commitMessage: data?.notes ? String(data.notes) : 'New Live OTA build deployed',
          source: 'live-url',
          liveUrl: normalized
        };
        notifyUpdate(details);
        return {
          found: true,
          message: `New Live OTA build detected (${remoteBuildId})!`,
          details
        };
      }
      return { found: false, message: '' };
    } catch {
      return { found: false, message: '' };
    }
  };

  // Combined Version Check (GitHub + Live OTA URL + Same-Origin Server + Service Worker)
  const checkForUpdatesNow = async (): Promise<{
    found: boolean;
    message: string;
    details?: DetectedVersionUpdate;
  }> => {
    if (isDisposed) return { found: false, message: '' };

    try {
      // 1. Check Service Worker waiting state on Web
      if (swRegistration) {
        await swRegistration.update().catch(() => undefined);
        if (swRegistration.waiting) {
          const swBuildId = 'sw-update-' + Date.now();
          const details: DetectedVersionUpdate = {
            buildId: swBuildId,
            previousBuildId: sessionBaselineBuildId || 'cached',
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

      // 2. Check GitHub Repository API (works in both Android APK and Web!)
      const ghResult = await checkGitHubForUpdates();
      if (ghResult.found) {
        return ghResult;
      }

      // 3. Check Live OTA URL (e.g. GitHub Pages)
      const liveResult = await checkLiveUrlForUpdates();
      if (liveResult.found) {
        return liveResult;
      }

      // 4. Check same-origin /api/version (when running on the Node/Express server)
      if (!isRunningInCapacitorOrAndroidWebView()) {
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => null);

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            const remoteBuildId = data?.buildId ? String(data.buildId) : '';
            if (remoteBuildId && !isDisposed) {
              const storedBuildId = localStorage.getItem(CACHED_BUILD_ID_STORAGE_KEY) || '';
              if (!storedBuildId && !sessionBaselineBuildId) {
                sessionBaselineBuildId = remoteBuildId;
                localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, remoteBuildId);
              } else {
                if (!sessionBaselineBuildId) {
                  sessionBaselineBuildId = storedBuildId || remoteBuildId;
                }
                if (navigator.serviceWorker?.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'CHECK_FOR_VERSION_UPDATE',
                    currentBuildId: sessionBaselineBuildId
                  });
                }
                if (remoteBuildId !== sessionBaselineBuildId) {
                  const details: DetectedVersionUpdate = {
                    buildId: remoteBuildId,
                    previousBuildId: sessionBaselineBuildId,
                    source: 'server',
                    commitMessage: 'New server build available'
                  };
                  notifyUpdate(details);
                  return {
                    found: true,
                    message: `New server build detected (${remoteBuildId})!`,
                    details
                  };
                }
              }
            }
          }
        }
      }

      return {
        found: false,
        message:
          ghResult.message ||
          'You are on the latest version. Set your GitHub repo below to auto-detect pushes from GitHub!'
      };
    } catch {
      return {
        found: false,
        message: 'Unable to check for updates right now.'
      };
    }
  };

  const isCapWebView = isRunningInCapacitorOrAndroidWebView();

  // Initialize bundled manifest seed, then register SW or run direct GitHub/OTA check
  seedBundledVersionManifest().finally(() => {
    if (isDisposed) return;
    if ('serviceWorker' in navigator) {
      if (isCapWebView) {
        // Inside Capacitor APK, unregister any local Service Worker so WebViewLocalServer never 404s,
        // and immediately check GitHub / Live OTA URL for updates!
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
              previousBuildId: sessionBaselineBuildId || 'cached',
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
                previousBuildId: sessionBaselineBuildId || 'cached',
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

  // Verify whether a remote Live OTA URL (e.g., GitHub Pages) is live and returns 200 OK before navigating
  const verifyLiveOtaUrlReachable = async (candidateUrl: string): Promise<string | null> => {
    if (!candidateUrl) return null;
    try {
      const normalized = candidateUrl.replace(/\/+$/, '');
      const checkRes = await fetch(`${normalized}/index.html?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (checkRes.ok) {
        return `${normalized}/?ota=${Date.now()}`;
      }
    } catch {
      // Not reachable or CORS blocked
    }
    return null;
  };

  const applyUpdateAndRefreshState = async (
    targetBuildId: string,
    beforeReload?: () => void,
    details?: DetectedVersionUpdate
  ): Promise<void> => {
    try {
      if (beforeReload) {
        beforeReload();
      }
      if (targetBuildId && !targetBuildId.startsWith('sw-')) {
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, targetBuildId);
        sessionBaselineBuildId = targetBuildId;
      }
      if (details?.commitSha) {
        localStorage.setItem(CACHED_COMMIT_SHA_STORAGE_KEY, details.commitSha);
        sessionBaselineCommitSha = details.commitSha;
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

      // If running inside the Android APK (or when a Live OTA URL is configured),
      // check if the Live OTA URL (e.g., GitHub Pages) is live and hot-load it!
      const cfg = getGitHubUpdateConfig();
      const candidateLiveUrl = details?.liveUrl || cfg.liveUrl;
      if (isCapWebView && candidateLiveUrl) {
        const verifiedUrl = await verifyLiveOtaUrlReachable(candidateLiveUrl);
        if (verifiedUrl) {
          window.location.href = verifiedUrl;
          return;
        }
      }
    } catch {
      // Proceed to reload even if cache purge times out
    }

    window.location.reload();
  };

  return {
    checkForUpdatesNow,
    applyUpdateAndRefreshState,
    getBaselineVersionInfo: () => ({
      buildId: sessionBaselineBuildId || 'local',
      commitSha: sessionBaselineCommitSha || 'local-head'
    }),
    dispose: () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    }
  };
}
