import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch {
    return '';
  }
}

function parseGitHubRepoFromRemote(remoteUrl) {
  if (!remoteUrl) return '';
  // Matches https://github.com/owner/repo.git or git@github.com:owner/repo.git
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return match ? match[1] : '';
}

try {
  const rootDir = process.cwd();
  console.log(`[Wizard Chess APK Sync] Working directory: ${rootDir}`);

  // 0. Stamp public/version.json with current git commit SHA & detected GitHub repository
  const versionJsonPath = resolve(rootDir, 'public', 'version.json');
  let existingVersion = {};
  if (existsSync(versionJsonPath)) {
    try {
      existingVersion = JSON.parse(readFileSync(versionJsonPath, 'utf8'));
    } catch {
      existingVersion = {};
    }
  }
  const gitSha = tryExec('git rev-parse --short=8 HEAD') || existingVersion.commitSha || `local-${Date.now()}`;
  const gitBranch = tryExec('git rev-parse --abbrev-ref HEAD') || existingVersion.branch || 'main';
  const gitRemoteUrl = tryExec('git remote get-url origin');
  const detectedGithubRepo = parseGitHubRepoFromRemote(gitRemoteUrl) || existingVersion.githubRepo || '';
  const stampedVersion = {
    ...existingVersion,
    version: existingVersion.version || '1.0.4',
    buildId: `apk-${gitSha}-${Date.now()}`,
    commitSha: gitSha,
    branch: gitBranch,
    githubRepo: detectedGithubRepo,
    liveUrl: existingVersion.liveUrl || '',
    updatedAt: new Date().toISOString()
  };
  writeFileSync(versionJsonPath, JSON.stringify(stampedVersion, null, 2) + '\n', 'utf8');
  console.log(`[Wizard Chess APK Sync] Stamped public/version.json (buildId=${stampedVersion.buildId}, repo=${detectedGithubRepo || 'configure in Settings'})`);

  // 1. Ensure root capacitor.config.json does not contain a private preview server.url or external OAuth allowNavigation
  const rootCapConfigPath = resolve(rootDir, 'capacitor.config.json');
  if (existsSync(rootCapConfigPath)) {
    const capCfg = JSON.parse(readFileSync(rootCapConfigPath, 'utf8'));
    capCfg.server = capCfg.server || {};
    delete capCfg.server.url;
    delete capCfg.server.allowNavigation;
    capCfg.server.hostname = 'wizardchess.localhost';
    capCfg.server.androidScheme = 'https';
    writeFileSync(rootCapConfigPath, JSON.stringify(capCfg, null, 2) + '\n', 'utf8');
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
    androidCapCfg.server = androidCapCfg.server || {};
    delete androidCapCfg.server.url;
    delete androidCapCfg.server.allowNavigation;
    androidCapCfg.server.hostname = 'wizardchess.localhost';
    androidCapCfg.server.androidScheme = 'https';
    writeFileSync(androidCapConfigPath, JSON.stringify(androidCapCfg, null, 2) + '\n', 'utf8');
    console.log('[Wizard Chess APK Sync] Verified clean local origin (https://wizardchess.localhost) in android/app/src/main/assets/capacitor.config.json.');
  }

  console.log('\n✅ [Wizard Chess APK Sync] Success! Bundled assets are synced into android/app/src/main/assets/public.');
  console.log('   Rebuild/Run the app in Android Studio Quail — GitHub & Live OTA auto-update detection is active.');
} catch (err) {
  console.error('\n❌ [Wizard Chess APK Sync] Failed:', err?.message || err);
  process.exit(1);
}
