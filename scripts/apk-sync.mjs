import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  const rootDir = process.cwd();
  console.log(`[Wizard Chess APK Sync] Working directory: ${rootDir}`);

  // 1. Ensure Capacitor packages are installed
  const capAndroidPath = resolve(rootDir, 'node_modules', '@capacitor', 'android');
  const capCliPath = resolve(rootDir, 'node_modules', '@capacitor', 'cli');
  if (!existsSync(capAndroidPath) || !existsSync(capCliPath)) {
    console.log('[Wizard Chess APK Sync] Installing @capacitor/core, @capacitor/cli, and @capacitor/android...');
    run('npm install @capacitor/core @capacitor/cli @capacitor/android');
  }

  // 2. Build the latest Vite web bundle into dist/
  console.log('[Wizard Chess APK Sync] Building latest web bundle (vite build)...');
  run('npx vite build');

  // 3. Add Android platform if android/ folder does not exist yet
  const androidDir = resolve(rootDir, 'android');
  if (!existsSync(androidDir)) {
    console.log('[Wizard Chess APK Sync] Creating Android Studio project (npx cap add android)...');
    run('npx cap add android');
  }

  // 4. Sync dist/ assets and live server.url config into android/app/src/main/assets
  console.log('[Wizard Chess APK Sync] Syncing web assets & live auto-update config into Android Studio project (npx cap sync android)...');
  run('npx cap sync android');

  console.log('\n✅ [Wizard Chess APK Sync] Success! Live Auto-Update Mode is enabled via capacitor.config.json (server.url).');
  console.log('   Once you build & install this APK one time, future updates published here will appear inside the app automatically!');
} catch (err) {
  console.error('\n❌ [Wizard Chess APK Sync] Failed:', err?.message || err);
  process.exit(1);
}
