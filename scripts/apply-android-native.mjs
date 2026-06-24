import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = join(root, 'native/android/MainActivity.java');
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
