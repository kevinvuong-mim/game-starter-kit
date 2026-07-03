import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync, unlinkSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SWIFT_FILE_REF_ID = 'F5LL5CRN1FED79650016851F';
const SWIFT_BUILD_FILE_ID = 'F5LL5CRN2FED79650016851F';
const SWIFT_FILE = 'FullscreenBridgeViewController.swift';
const GOOGLE_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

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
  const configured = process.env.VITE_ADMOB_IOS_APP_ID?.trim();
  if (configured) return configured;
  if (process.env.VITE_ADS_PROVIDER === 'admob') return GOOGLE_SAMPLE_IOS_APP_ID;
  return '';
}

function patchPodfile(podfilePath) {
  if (!existsSync(podfilePath)) return false;
  let content = readFileSync(podfilePath, 'utf8');
  if (content.includes("pod 'GoogleUserMessagingPlatform'")) return false;

  content = content.replace(
    /(target 'App' do\n(?:.*\n)*? {2}# Add your Pods here\n)/,
    `$1  pod 'GoogleUserMessagingPlatform', '~> 2.3'\n`
  );
  writeFileSync(podfilePath, content);
  console.log('[ios-native] Pinned GoogleUserMessagingPlatform ~> 2.3 in Podfile');
  return true;
}

function patchInfoPlist(plistPath) {
  let content = readFileSync(plistPath, 'utf8');

  if (!content.includes('UIStatusBarHidden')) {
    content = content.replace(
      '</dict>\n</plist>',
      '\t<key>UIStatusBarHidden</key>\n\t<true/>\n\t<key>UIStatusBarStyle</key>\n\t<string>UIStatusBarStyleLightContent</string>\n</dict>\n</plist>'
    );
    writeFileSync(plistPath, content);
    console.log('[ios-native] Applied status bar Info.plist keys');
  }
}

function patchAdMobPlist(plistPath, appId) {
  let content = readFileSync(plistPath, 'utf8');

  if (content.includes('GADApplicationIdentifier')) {
    const updated = content.replace(
      /<key>GADApplicationIdentifier<\/key>\s*<string>[^<]*<\/string>/,
      `<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>`
    );
    if (updated !== content) {
      writeFileSync(plistPath, updated);
      return 'updated';
    }
    return 'present';
  }

  const snippet =
    `\t<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>\n` +
    `\t<key>NSUserTrackingUsageDescription</key>\n` +
    `\t<string>This identifier will be used to deliver personalized ads to you.</string>\n` +
    `\t<key>SKAdNetworkItems</key>\n\t<array>\n\t\t<dict>\n` +
    `\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n` +
    `\t\t</dict>\n\t</array>\n`;

  content = content.replace('</dict>\n</plist>', `${snippet}</dict>\n</plist>`);
  writeFileSync(plistPath, content);
  return 'injected';
}

function patchPbxproj(projectPath) {
  let content = readFileSync(projectPath, 'utf8');
  if (content.includes(SWIFT_FILE)) return;

  content = content.replace(
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };',
    `504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };
\t\t${SWIFT_BUILD_FILE_ID} /* ${SWIFT_FILE} in Sources */ = {isa = PBXBuildFile; fileRef = ${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */; };`
  );

  content = content.replace(
    '504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };',
    `504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
\t\t${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${SWIFT_FILE}; sourceTree = "<group>"; };`
  );

  content = content.replace(
    '504EC3071FED79650016851F /* AppDelegate.swift */,',
    `504EC3071FED79650016851F /* AppDelegate.swift */,
\t\t\t\t${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */,`
  );

  content = content.replace(
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */,',
    `504EC3081FED79650016851F /* AppDelegate.swift in Sources */,
\t\t\t\t${SWIFT_BUILD_FILE_ID} /* ${SWIFT_FILE} in Sources */,`
  );

  writeFileSync(projectPath, content);
  console.log('[ios-native] Registered FullscreenBridgeViewController in Xcode project');
}

loadEnvFile('.env');

const mode = process.argv[2] ?? 'post-sync';
const iosAppDir = join(root, 'ios/App/App');
const iosProject = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
const nativeDir = join(root, 'native/ios');
const plistPath = join(iosAppDir, 'Info.plist');
const podDir = join(root, 'ios/App');
const podfilePath = join(podDir, 'Podfile');
const podfileLockPath = join(podDir, 'Podfile.lock');

if (!existsSync(iosAppDir)) {
  console.warn('[ios-native] iOS project not found — run `npx cap add ios` first');
  process.exit(0);
}

if (mode === 'pre-sync') {
  const podfileChanged = patchPodfile(podfilePath);
  if (podfileChanged && existsSync(podfileLockPath)) {
    unlinkSync(podfileLockPath);
    console.log('[ios-native] Cleared Podfile.lock after UMP pin change');
  }
  process.exit(0);
}

if (existsSync(nativeDir)) {
  const swiftTemplate = join(nativeDir, SWIFT_FILE);
  const storyboardTemplate = join(nativeDir, 'Main.storyboard');

  if (existsSync(swiftTemplate)) {
    copyFileSync(swiftTemplate, join(iosAppDir, SWIFT_FILE));
  }
  if (existsSync(storyboardTemplate)) {
    copyFileSync(storyboardTemplate, join(iosAppDir, 'Base.lproj/Main.storyboard'));
  }
  if (existsSync(iosProject) && existsSync(swiftTemplate)) {
    patchPbxproj(iosProject);
  }
} else {
  console.warn('[ios-native] native/ios templates not found — skipping fullscreen storyboard copy');
}

patchInfoPlist(plistPath);

const adsProvider = process.env.VITE_ADS_PROVIDER ?? 'mock';
const admobAppId = resolveAdMobAppId();

if (adsProvider === 'admob') {
  if (!admobAppId) {
    console.error('[ios-native] VITE_ADS_PROVIDER=admob requires VITE_ADMOB_IOS_APP_ID');
    process.exit(1);
  }

  const result = patchAdMobPlist(plistPath, admobAppId);
  console.log(`[ios-native] AdMob GADApplicationIdentifier ${result}: ${admobAppId}`);
} else if (admobAppId) {
  const result = patchAdMobPlist(plistPath, admobAppId);
  console.log(`[ios-native] AdMob GADApplicationIdentifier ${result}: ${admobAppId}`);
}

console.log('[ios-native] Applied iOS native config');
