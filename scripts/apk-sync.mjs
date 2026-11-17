import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  const rootDir = process.cwd();
  console.log(`[Wizard Chess APK Sync] Working directory: ${rootDir}`);

  // 1. Ensure root capacitor.config.json does not contain a private preview server.url
  const rootCapConfigPath = resolve(rootDir, 'capacitor.config.json');
  if (existsSync(rootCapConfigPath)) {
    const capCfg = JSON.parse(readFileSync(rootCapConfigPath, 'utf8'));
    if (capCfg?.server?.url) {
      delete capCfg.server.url;
      capCfg.server.androidScheme = 'https';
      writeFileSync(rootCapConfigPath, JSON.stringify(capCfg, null, 2) + '\n', 'utf8');
      console.log('[Wizard Chess APK Sync] Removed remote server.url from capacitor.config.json to prevent 404 Page Not Found.');
    }
  }

  // 2. Ensure Capacitor packages are installed
  const capAndroidPath = resolve(rootDir, 'node_modules', '@capacitor', 'android');
  const capCliPath = resolve(rootDir, 'node_modules', '@capacitor', 'cli');
  if (!existsSync(capAndroidPath) || !existsSync(capCliPath)) {
    console.log('[Wizard Chess APK Sync] Installing @capacitor/core, @capacitor/cli, and @capacitor/android...');
    run('npm install @capacitor/core @capacitor/cli @capacitor/android');
  }

  // 3. Build the latest Vite web bundle into dist/
  console.log('[Wizard Chess APK Sync] Building latest web bundle (vite build)...');
  run('npx vite build');

  // 4. Add Android platform if android/ folder does not exist yet
  const androidDir = resolve(rootDir, 'android');
  if (!existsSync(androidDir)) {
    console.log('[Wizard Chess APK Sync] Creating Android Studio project (npx cap add android)...');
    run('npx cap add android');
  }

  // 5. Sync dist/ assets into android/app/src/main/assets/public
  console.log('[Wizard Chess APK Sync] Syncing web assets into Android Studio project (npx cap sync android)...');
  run('npx cap sync android');

  // 6. Double-check android/app/src/main/assets/capacitor.config.json to ensure no stale server.url remains
  const androidCapConfigPath = resolve(
    rootDir,
    'android',
    'app',
    'src',
    'main',
    'assets',
    'capacitor.config.json'
  );
  if (existsSync(androidCapConfigPath)) {
    const androidCapCfg = JSON.parse(readFileSync(androidCapConfigPath, 'utf8'));
    if (androidCapCfg?.server?.url) {
      delete androidCapCfg.server.url;
      androidCapCfg.server.androidScheme = 'https';
      writeFileSync(androidCapConfigPath, JSON.stringify(androidCapCfg, null, 2) + '\n', 'utf8');
      console.log('[Wizard Chess APK Sync] Cleaned stale server.url from android/app/src/main/assets/capacitor.config.json.');
    }
  }

  console.log('\n✅ [Wizard Chess APK Sync] Success! Bundled assets are synced into android/app/src/main/assets/public.');
  console.log('   Rebuild/Run the app in Android Studio Quail — the 404 Page Not Found error is now fixed.');
} catch (err) {
  console.error('\n❌ [Wizard Chess APK Sync] Failed:', err?.message || err);
  process.exit(1);
}
