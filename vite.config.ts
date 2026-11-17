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

function stampVersionManifestPlugin(rootDir: string, env: Record<string, string>): Plugin {
  return {
    name: 'stamp-version-manifest',
    buildStart() {
      try {
        const versionPath = path.resolve(rootDir, 'public', 'version.json');
        let existing: Record<string, string> = {};
        if (fs.existsSync(versionPath)) {
          try {
            existing = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
          } catch {
            existing = {};
          }
        }
        const sha =
          tryGit('git rev-parse --short=8 HEAD') ||
          existing.commitSha ||
          'local-head';
        const branch =
          env.VITE_GITHUB_BRANCH ||
          tryGit('git rev-parse --abbrev-ref HEAD') ||
          existing.branch ||
          'main';
        const detectedRepo =
          env.VITE_GITHUB_REPO ||
          parseGitHubRepo(tryGit('git remote get-url origin')) ||
          existing.githubRepo ||
          '';
        const liveUrl = env.VITE_OTA_LIVE_URL || existing.liveUrl || '';
        const nextManifest = {
          ...existing,
          version: existing.version || '1.0.4',
          buildId: `build-${sha}-${Date.now()}`,
          commitSha: sha,
          branch,
          githubRepo: detectedRepo,
          liveUrl,
          updatedAt: new Date().toISOString()
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

  return {
    root: rootDir,
    base: './',
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
    plugins: [react(), stampVersionManifestPlugin(rootDir, env)],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
  };
});

