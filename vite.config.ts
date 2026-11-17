import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
  };
});
