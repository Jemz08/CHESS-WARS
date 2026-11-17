import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function tryGit(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch {
    return '';
  }
}

function parseGitHubRepo(remoteUrl: string): string {
  if (!remoteUrl) return '';
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return match ? match[1] : '';
}

const DEFAULT_CLOUD_RUN_LIVE_URL =
  'https://ais-pre-64yibneopxihyh3rjs6f74-281552636048.asia-southeast1.run.app';

function isValidGitHubRepoSlug(val: string): boolean {
  const trimmed = (val || '').trim();
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed);
}

function isValidHttpUrl(val: string): boolean {
  const trimmed = (val || '').trim();
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
}

function isValidBranchName(val: string): boolean {
  const trimmed = (val || '').trim();
  if (!trimmed || /^jemz\d*$/i.test(trimmed)) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(trimmed);
}

function stampVersionManifestPlugin(
  rootDir: string,
  env: Record<string, string>,
  buildMeta: { buildId: string; sha: string; branch: string; githubRepo: string; liveUrl: string; timestamp: number }
): Plugin {
  return {
    name: 'stamp-version-manifest',
    buildStart() {
      try {
        const versionPath = path.resolve(rootDir, 'public', 'version.json');
        let existing: Record<string, unknown> = {};
        if (fs.existsSync(versionPath)) {
          try {
            existing = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
          } catch {
            existing = {};
          }
        }
        const nextManifest = {
          ...existing,
          version: (typeof existing.version === 'string' && existing.version) || '1.0.5',
          buildId: buildMeta.buildId,
          commitSha: buildMeta.sha,
          buildTimestamp: buildMeta.timestamp,
          branch: buildMeta.branch,
          githubRepo: buildMeta.githubRepo,
          liveUrl: buildMeta.liveUrl,
          updatedAt: new Date(buildMeta.timestamp).toISOString(),
          notes:
            'Gameplay Landscape/Portrait toggle, Capture Camera Zoom ON/OFF toggle, and APK Live OTA Hot-Update'
        };
        fs.writeFileSync(versionPath, JSON.stringify(nextManifest, null, 2) + '\n', 'utf8');
      } catch {
        // Non-fatal if filesystem is read-only
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname);
  const env = loadEnv(mode, rootDir, '');
  const isProd = mode === 'production';

  const versionPath = path.resolve(rootDir, 'public', 'version.json');
  let existing: Record<string, string> = {};
  if (fs.existsSync(versionPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const timestamp = Date.now();
  const gitSha = tryGit('git rev-parse --short=8 HEAD');
  const sha =
    gitSha ||
    (existing.commitSha && existing.commitSha !== 'local-head' ? existing.commitSha : '') ||
    'local-head';
  const branchCandidate =
    (isValidBranchName(env.VITE_GITHUB_BRANCH) ? env.VITE_GITHUB_BRANCH.trim() : '') ||
    tryGit('git rev-parse --abbrev-ref HEAD') ||
    (isValidBranchName(existing.branch) ? existing.branch.trim() : '') ||
    'main';
  const repoCandidate =
    (isValidGitHubRepoSlug(env.VITE_GITHUB_REPO) ? env.VITE_GITHUB_REPO.trim() : '') ||
    parseGitHubRepo(tryGit('git remote get-url origin')) ||
    (isValidGitHubRepoSlug(existing.githubRepo) ? existing.githubRepo.trim() : '') ||
    '';
  const liveUrlCandidate =
    (isValidHttpUrl(env.VITE_OTA_LIVE_URL) ? env.VITE_OTA_LIVE_URL.trim() : '') ||
    (isValidHttpUrl(env.CAPACITOR_SERVER_URL) ? env.CAPACITOR_SERVER_URL.trim() : '') ||
    (isValidHttpUrl(existing.liveUrl) ? existing.liveUrl.trim() : '') ||
    DEFAULT_CLOUD_RUN_LIVE_URL;
  const buildId = `build-${sha}-${timestamp}`;

  const buildMeta = {
    buildId,
    sha,
    branch: branchCandidate,
    githubRepo: repoCandidate,
    liveUrl: liveUrlCandidate,
    timestamp
  };

  return {
    root: rootDir,
    base: './',
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildMeta.buildId),
      __APP_COMMIT_SHA__: JSON.stringify(buildMeta.sha),
      __APP_BUILD_TIMESTAMP__: JSON.stringify(buildMeta.timestamp),
      __APP_DEFAULT_LIVE_URL__: JSON.stringify(buildMeta.liveUrl)
    },
    esbuild: {
      // Strip all license/legal and inline comments from the compiled output
      legalComments: 'none',
      // Strip console.* and debugger statements in production builds
      drop: isProd ? ['console', 'debugger'] : ['debugger'],
      // Allow function and class names to be mangled into short identifiers
      keepNames: false,
      // Mangle internal properties prefixed with _obf_
      mangleProps: /^_obf_/,
    },
    build: {
      outDir: path.resolve(rootDir, 'dist'),
      emptyOutDir: true,
      // Never emit source maps so original TypeScript/React source cannot be reconstructed
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      target: 'es2020',
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          // Obfuscate output bundle and asset filenames using hashes only
          entryFileNames: 'assets/c-[hash].js',
          chunkFileNames: 'assets/k-[hash].js',
          assetFileNames: 'assets/a-[hash][extname]',
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), stampVersionManifestPlugin(rootDir, env, buildMeta)],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
  };
});

