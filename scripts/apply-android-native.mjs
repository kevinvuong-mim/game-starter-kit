import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(name) {
  const envPath = join(root, name);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

// process.env is not auto-populated from .env files for plain node scripts.
loadEnvFile('.env');

const template = join(root, 'native/android/MainActivity.java');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');
const admobSnippet = join(root, 'native/android/admob-manifest-snippet.xml');
const networkConfigPath = join(
  root,
  'android/app/src/main/res/xml/network_security_config.xml',
);
const target = join(
  root,
  'android/app/src/main/java/com/studio/gamestarterkit/MainActivity.java',
);

// Dev-only cleartext (HTTP) exceptions so the app can reach a local backend.
// Production traffic still requires HTTPS. 10.0.2.2 is the Android emulator's
// alias for the host machine's localhost.
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.103.109</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
`;

if (!existsSync(template)) {
  console.warn('[android-native] Template not found, skipping');
  process.exit(0);
}

if (!existsSync(target)) {
  console.warn('[android-native] Android project not found, run `npx cap add android` first');
  process.exit(0);
}

copyFileSync(template, target);
console.log('[android-native] Applied fullscreen MainActivity');

const admobAppId = process.env.VITE_ADMOB_ANDROID_APP_ID;
if (admobAppId && existsSync(manifestPath) && existsSync(admobSnippet)) {
  let manifest = readFileSync(manifestPath, 'utf8');
  const metaTag = 'com.google.android.gms.ads.APPLICATION_ID';

  if (!manifest.includes(metaTag)) {
    const snippet = readFileSync(admobSnippet, 'utf8').replace('${ADMOB_ANDROID_APP_ID}', admobAppId);
    const valueMatch = snippet.match(/android:value="([^"]+)"/);
    const value = valueMatch?.[1] ?? admobAppId;

    manifest = manifest.replace(
      '</application>',
      `    <meta-data android:name="${metaTag}" android:value="${value}" />\n  </application>`,
    );
    writeFileSync(manifestPath, manifest);
    console.log('[android-native] Injected AdMob APPLICATION_ID into AndroidManifest.xml');
  }
} else if (!admobAppId) {
  console.warn('[android-native] VITE_ADMOB_ANDROID_APP_ID not set — skip AdMob manifest injection');
}

if (!existsSync(networkConfigPath)) {
  mkdirSync(dirname(networkConfigPath), { recursive: true });
  writeFileSync(networkConfigPath, NETWORK_SECURITY_CONFIG);
  console.log('[android-native] Created network_security_config.xml (dev cleartext exceptions)');
}

if (existsSync(manifestPath)) {
  let manifest = readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android:networkSecurityConfig')) {
    manifest = manifest.replace(
      '<application',
      '<application\n        android:networkSecurityConfig="@xml/network_security_config"',
    );
    writeFileSync(manifestPath, manifest);
    console.log('[android-native] Linked networkSecurityConfig in AndroidManifest.xml');
  }
}
