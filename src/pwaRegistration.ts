import { useEffect, useState } from 'react';

export const CACHED_BUILD_ID_STORAGE_KEY = 'wizardchess_cached_build_id';

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
 * Registers the Service Worker (`/sw.js`), caches game assets, and checks `/api/version`
 * on load, on visibility resume, and periodically.
 * Calls `onNewVersionDetected(newBuildId, previousBuildId)` when a new build or waiting SW is found.
 */
export function registerGameServiceWorkerAndVersionWatcher(
  onNewVersionDetected: (newBuildId: string, previousBuildId: string) => void
): {
  checkForUpdatesNow: () => Promise<boolean>;
  applyUpdateAndRefreshState: (targetBuildId: string, beforeReload?: () => void) => Promise<void>;
  dispose: () => void;
} {
  let isDisposed = false;
  let swRegistration: ServiceWorkerRegistration | null = null;
  let sessionBaselineBuildId: string =
    localStorage.getItem(CACHED_BUILD_ID_STORAGE_KEY) || '';

  const notifyUpdate = (newBuildId: string) => {
    if (isDisposed) return;
    const prev = sessionBaselineBuildId || 'cached';
    onNewVersionDetected(newBuildId, prev);
  };

  // 1. Direct + Service-Worker assisted version check on load & demand
  const checkForUpdatesNow = async (): Promise<boolean> => {
    if (isDisposed) return false;
    try {
      if (swRegistration) {
        await swRegistration.update().catch(() => undefined);
        if (swRegistration.waiting) {
          notifyUpdate('sw-update-' + Date.now());
          return true;
        }
      }

      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;
      const data = await res.json();
      const remoteBuildId = data?.buildId ? String(data.buildId) : '';
      if (!remoteBuildId || isDisposed) return false;

      const storedBuildId = localStorage.getItem(CACHED_BUILD_ID_STORAGE_KEY) || '';

      // First ever boot on this device: record the current build ID
      if (!storedBuildId && !sessionBaselineBuildId) {
        sessionBaselineBuildId = remoteBuildId;
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, remoteBuildId);
        return false;
      }

      if (!sessionBaselineBuildId) {
        sessionBaselineBuildId = storedBuildId || remoteBuildId;
      }

      // Ask the active Service Worker to verify as well
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_FOR_VERSION_UPDATE',
          currentBuildId: sessionBaselineBuildId
        });
      }

      if (remoteBuildId !== sessionBaselineBuildId) {
        notifyUpdate(remoteBuildId);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // 2. Register Service Worker (`/sw.js`) for game asset caching & update lifecycle
  if ('serviceWorker' in navigator) {
    const onSwMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg.type !== 'string') return;
      if (msg.type === 'NEW_VERSION_AVAILABLE' && msg.buildId) {
        notifyUpdate(String(msg.buildId));
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        if (isDisposed) return;
        swRegistration = reg;

        if (reg.waiting) {
          notifyUpdate('sw-waiting-' + Date.now());
        }

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New Service Worker installed & waiting -> trigger New Version Available toast
              checkForUpdatesNow();
            }
          });
        });

        // Perform initial version check on load once SW is registered
        checkForUpdatesNow();
      })
      .catch(() => {
        // Fallback direct version check if SW registration is blocked by iframe security policy
        checkForUpdatesNow();
      });
  } else {
    checkForUpdatesNow();
  }

  const intervalId = window.setInterval(() => {
    checkForUpdatesNow();
  }, 25000);

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
    beforeReload?: () => void
  ): Promise<void> => {
    try {
      if (beforeReload) {
        beforeReload();
      }
      if (targetBuildId && !targetBuildId.startsWith('sw-')) {
        localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, targetBuildId);
      } else {
        // Fetch latest buildId to store before reload
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' }).catch(
          () => null
        );
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.buildId) {
            localStorage.setItem(CACHED_BUILD_ID_STORAGE_KEY, String(data.buildId));
          }
        }
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
    } catch {
      // Proceed to reload even if cache purge times out
    }

    window.location.reload();
  };

  return {
    checkForUpdatesNow,
    applyUpdateAndRefreshState,
    dispose: () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    }
  };
}
