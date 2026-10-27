import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname);
  const env = loadEnv(mode, rootDir, '');
  return {
    root: rootDir,
    build: {
      outDir: path.resolve(rootDir, 'dist'),
      emptyOutDir: true,
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
