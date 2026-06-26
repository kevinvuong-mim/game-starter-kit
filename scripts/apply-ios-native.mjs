import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
patchAdMobPlist(join(iosAppDir, 'Info.plist'));

if (existsSync(iosProject)) {
  patchPbxproj(iosProject);
}

console.log('[ios-native] Applied fullscreen iOS native config');
