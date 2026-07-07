import {
  resolvePushNotificationsEnabled,
  resolveLocalNotificationsEnabled,
} from './notification-config.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FCM_DEFAULT_CHANNEL_ID = 'game_alerts';
const ANDROID_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
];
const ADMOB_META_NAME = 'com.google.android.gms.ads.APPLICATION_ID';
const GOOGLE_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const FCM_CHANNEL_META = 'com.google.firebase.messaging.default_notification_channel_id';

function loadEnvFile(name) {
  const envPath = join(root, name);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function resolveAdMobAppId() {
  const configured = process.env.VITE_ADMOB_ANDROID_APP_ID?.trim();
  if (configured) return configured;
  if (process.env.VITE_ADS_PROVIDER === 'admob') return GOOGLE_SAMPLE_ANDROID_APP_ID;
  return '';
}

function injectAdMobManifest(manifestPath, appId) {
  let manifest = readFileSync(manifestPath, 'utf8');

  if (manifest.includes(ADMOB_META_NAME)) {
    const updated = manifest.replace(
      new RegExp(
        `<meta-data\\s+android:name="${ADMOB_META_NAME}"\\s+android:value="[^"]*"\\s*/>`,
        's'
      ),
      `<meta-data android:name="${ADMOB_META_NAME}" android:value="${appId}" />`
    );

    if (updated !== manifest) {
      writeFileSync(manifestPath, updated);
      return 'updated';
    }

    return 'present';
  }

  manifest = manifest.replace(
    '</application>',
    `        <meta-data android:name="${ADMOB_META_NAME}" android:value="${appId}" />\n    </application>`
  );
  writeFileSync(manifestPath, manifest);
  return 'injected';
}

function injectNotificationPermissions(manifestPath) {
  let manifest = readFileSync(manifestPath, 'utf8');
  let changed = false;

  const permissionBlock = ANDROID_PERMISSIONS.map(
    (permission) => `    <uses-permission android:name="${permission}" />`
  ).join('\n');

  for (const permission of ANDROID_PERMISSIONS) {
    if (!manifest.includes(`android:name="${permission}"`)) {
      changed = true;
      break;
    }
  }

  if (changed) {
    manifest = manifest.replace(
      '    <uses-permission android:name="android.permission.INTERNET" />',
      `${permissionBlock}\n    <uses-permission android:name="android.permission.INTERNET" />`
    );
  }

  if (changed) {
    writeFileSync(manifestPath, manifest);
  }

  return changed ? 'updated' : 'present';
}

function injectFcmChannelMetadata(manifestPath) {
  let manifest = readFileSync(manifestPath, 'utf8');

  if (manifest.includes(FCM_CHANNEL_META)) {
    return 'present';
  }

  manifest = manifest.replace(
    '</application>',
    `        <meta-data android:name="${FCM_CHANNEL_META}" android:value="${FCM_DEFAULT_CHANNEL_ID}" />\n    </application>`
  );
  writeFileSync(manifestPath, manifest);
  return 'updated';
}

function copyFirebaseAndroidConfig() {
  const source = join(root, 'native/firebase/google-services.json');
  const target = join(root, 'android/app/google-services.json');

  if (!existsSync(source)) {
    console.warn(
      '[android-native] Missing native/firebase/google-services.json — FCM push will not work until you add it'
    );
    return false;
  }

  copyFileSync(source, target);
  console.log('[android-native] Copied google-services.json to android/app/');
  return true;
}

loadEnvFile('.env');

const template = join(root, 'native/android/MainActivity.java');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');
const target = join(root, 'android/app/src/main/java/com/studio/gamestarterkit/MainActivity.java');

if (existsSync(template) && existsSync(target)) {
  copyFileSync(template, target);
  console.log('[android-native] Applied MainActivity template');
} else if (!existsSync(target)) {
  console.warn('[android-native] Android project not found — run `npx cap add android` first');
}

const adsProvider = process.env.VITE_ADS_PROVIDER ?? 'mock';
const admobAppId = resolveAdMobAppId();

if (adsProvider === 'admob') {
  if (!existsSync(manifestPath)) {
    console.error('[android-native] AndroidManifest.xml not found — cannot inject AdMob App ID');
    process.exit(1);
  }

  if (!admobAppId) {
    console.error('[android-native] VITE_ADS_PROVIDER=admob requires VITE_ADMOB_ANDROID_APP_ID');
    process.exit(1);
  }

  const result = injectAdMobManifest(manifestPath, admobAppId);
  console.log(`[android-native] AdMob APPLICATION_ID ${result}: ${admobAppId}`);
} else if (admobAppId && existsSync(manifestPath)) {
  const result = injectAdMobManifest(manifestPath, admobAppId);
  console.log(`[android-native] AdMob APPLICATION_ID ${result}: ${admobAppId}`);
}

const pushEnabled = resolvePushNotificationsEnabled();
const localEnabled = resolveLocalNotificationsEnabled();

if ((pushEnabled || localEnabled) && existsSync(manifestPath)) {
  const permissionsResult = injectNotificationPermissions(manifestPath);
  console.log(`[android-native] Notification permissions ${permissionsResult}`);
}

if (pushEnabled && existsSync(manifestPath)) {
  const channelResult = injectFcmChannelMetadata(manifestPath);
  console.log(`[android-native] FCM notification channel ${channelResult}`);
  copyFirebaseAndroidConfig();
}
