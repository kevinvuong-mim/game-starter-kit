import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = join(root, 'native/android/MainActivity.java');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');
const admobSnippet = join(root, 'native/android/admob-manifest-snippet.xml');
const target = join(
  root,
  'android/app/src/main/java/com/studio/gamestarterkit/MainActivity.java',
);

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
