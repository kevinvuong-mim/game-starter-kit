import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

const iosAppDir = join(root, 'ios/App/App');
const iosProject = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
const nativeDir = join(root, 'native/ios');

const SWIFT_FILE = 'FullscreenBridgeViewController.swift';
const SWIFT_FILE_REF_ID = 'F5LL5CRN1FED79650016851F';
const SWIFT_BUILD_FILE_ID = 'F5LL5CRN2FED79650016851F';

function patchInfoPlist(plistPath) {
  let content = readFileSync(plistPath, 'utf8');

  if (!content.includes('UIStatusBarHidden')) {
    content = content.replace(
      '</dict>\n</plist>',
      '\t<key>UIStatusBarHidden</key>\n\t<true/>\n\t<key>UIStatusBarStyle</key>\n\t<string>UIStatusBarStyleLightContent</string>\n</dict>\n</plist>',
    );
  }

  writeFileSync(plistPath, content);
}

function patchAtsPlist(plistPath) {
  let content = readFileSync(plistPath, 'utf8');
  if (content.includes('NSAppTransportSecurity')) {
    return;
  }

  // NSAllowsLocalNetworking permits cleartext HTTP to local-network IP ranges
  // (e.g. a 192.168.x.x dev backend) while keeping ATS enforced for the public internet.
  const snippet =
    `\t<key>NSAppTransportSecurity</key>\n\t<dict>\n` +
    `\t\t<key>NSAllowsLocalNetworking</key>\n\t\t<true/>\n\t</dict>\n`;

  content = content.replace('</dict>\n</plist>', `${snippet}</dict>\n</plist>`);
  writeFileSync(plistPath, content);
  console.log('[ios-native] Enabled NSAllowsLocalNetworking for local-HTTP dev backends');
}

function patchAdMobPlist(plistPath) {
  const appId = process.env.VITE_ADMOB_IOS_APP_ID;
  if (!appId) {
    console.warn('[ios-native] VITE_ADMOB_IOS_APP_ID not set — skip AdMob Info.plist injection');
    return;
  }

  let content = readFileSync(plistPath, 'utf8');
  if (content.includes('GADApplicationIdentifier')) {
    return;
  }

  // GADApplicationIdentifier is required by Google Mobile Ads SDK — missing it crashes on launch.
  // SKAdNetworkItems enables ad attribution; NSUserTrackingUsageDescription drives the ATT prompt.
  const snippet =
    `\t<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>\n` +
    `\t<key>NSUserTrackingUsageDescription</key>\n` +
    `\t<string>This identifier will be used to deliver personalized ads to you.</string>\n` +
    `\t<key>SKAdNetworkItems</key>\n\t<array>\n\t\t<dict>\n` +
    `\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n` +
    `\t\t</dict>\n\t</array>\n`;

  content = content.replace('</dict>\n</plist>', `${snippet}</dict>\n</plist>`);
  writeFileSync(plistPath, content);
  console.log('[ios-native] Injected AdMob GADApplicationIdentifier into Info.plist');
}

function patchPbxproj(projectPath) {
  let content = readFileSync(projectPath, 'utf8');

  if (content.includes(SWIFT_FILE)) {
    return;
  }

  content = content.replace(
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };',
    `504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };
\t\t${SWIFT_BUILD_FILE_ID} /* ${SWIFT_FILE} in Sources */ = {isa = PBXBuildFile; fileRef = ${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */; };`,
  );

  content = content.replace(
    '504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };',
    `504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
\t\t${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${SWIFT_FILE}; sourceTree = "<group>"; };`,
  );

  content = content.replace(
    '504EC3071FED79650016851F /* AppDelegate.swift */,',
    `504EC3071FED79650016851F /* AppDelegate.swift */,
\t\t\t\t${SWIFT_FILE_REF_ID} /* ${SWIFT_FILE} */,`,
  );

  content = content.replace(
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */,',
    `504EC3081FED79650016851F /* AppDelegate.swift in Sources */,
\t\t\t\t${SWIFT_BUILD_FILE_ID} /* ${SWIFT_FILE} in Sources */,`,
  );

  writeFileSync(projectPath, content);
}

// @capacitor-community/admob@6.2.0 uses the legacy UMPConsentStatus API. The Google
// Mobile Ads pod only requires GoogleUserMessagingPlatform >= 1.1, so a fresh `pod install`
// pulls UMP 3.x which renamed it (UMPConsentStatus -> ConsentStatus) and breaks the build.
// Pin UMP to the 2.x line; re-run `pod install` if we had to add the pin.
function patchPodfile(podfilePath) {
  if (!existsSync(podfilePath)) return;
  let content = readFileSync(podfilePath, 'utf8');
  if (content.includes("pod 'GoogleUserMessagingPlatform'")) return;

  content = content.replace(
    /(target 'App' do\n(?:.*\n)*? {2}# Add your Pods here\n)/,
    `$1  pod 'GoogleUserMessagingPlatform', '~> 2.3'\n`,
  );
  writeFileSync(podfilePath, content);
  console.log('[ios-native] Pinned GoogleUserMessagingPlatform ~> 2.3 in Podfile');

  try {
    execSync('pod install', { cwd: join(root, 'ios/App'), stdio: 'inherit' });
  } catch {
    console.warn('[ios-native] `pod install` failed — run it manually in ios/App');
  }
}

if (!existsSync(nativeDir)) {
  console.warn('[ios-native] Template not found, skipping');
  process.exit(0);
}

if (!existsSync(iosAppDir)) {
  console.warn('[ios-native] iOS project not found, run `npx cap add ios` first');
  process.exit(0);
}

copyFileSync(join(nativeDir, SWIFT_FILE), join(iosAppDir, SWIFT_FILE));
copyFileSync(join(nativeDir, 'Main.storyboard'), join(iosAppDir, 'Base.lproj/Main.storyboard'));
patchInfoPlist(join(iosAppDir, 'Info.plist'));
patchAtsPlist(join(iosAppDir, 'Info.plist'));
patchAdMobPlist(join(iosAppDir, 'Info.plist'));

if (existsSync(iosProject)) {
  patchPbxproj(iosProject);
}

patchPodfile(join(root, 'ios/App/Podfile'));

console.log('[ios-native] Applied fullscreen iOS native config');
