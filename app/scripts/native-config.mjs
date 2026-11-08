#!/usr/bin/env node
// Set what Try Line needs in the native projects, after `npx cap add ios` and `npx cap add android`. Safe to run again:
// a project already set is left as it is. A platform not added yet is skipped.
//   node scripts/native-config.mjs
// iOS (ios/App/App/Info.plist and ios/App/App.xcodeproj):
//   - landscape only, either way up, on iPhone and iPad. UIRequiresFullScreen too, as iPad multitasking would otherwise
//     need every orientation.
//   - no status bar from launch (UIStatusBarHidden). UIViewControllerBasedStatusBarAppearance stays YES, as the StatusBar
//     plugin needs.
//   - ITSAppUsesNonExemptEncryption NO: the only encryption is the system's own HTTPS, so each upload skips the question.
//   - PrivacyInfo.xcprivacy (native/): no tracking, no data collected, and UserDefaults read and written for the app's own
//     data (reason CA92.1), which is how Preferences keeps the save's copy. Added to the App target's resources.
// Android (android/app/src/main/AndroidManifest.xml):
//   - landscape either way up (sensorLandscape) for the game's activity.
//   - the advertising ID permission removed, should any library ever bring it in (Google Play's Families policy).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../', import.meta.url));
const LANDSCAPE = ['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'];
export const PLIST = {
  'UISupportedInterfaceOrientations': LANDSCAPE,
  'UISupportedInterfaceOrientations~ipad': LANDSCAPE,
  UIRequiresFullScreen: true,
  UIStatusBarHidden: true,
  UIViewControllerBasedStatusBarAppearance: true,
  ITSAppUsesNonExemptEncryption: false,
};

const plistValue = v => Array.isArray(v) ? '<array>\n' + v.map(s => '\t\t<string>' + s + '</string>\n').join('') + '\t</array>' : v === true ? '<true/>' : v === false ? '<false/>' : '<string>' + v + '</string>';
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* One key of the top-level dict set to a string, a boolean or an array of strings, in place when it is there, else added at
   the end. The keys set here hold no nested dict, so the first value after the key is its own. */
function plistSet(xml, key, value) {
  const re = new RegExp('(<key>' + escapeRe(key) + '</key>\\s*)(<array>[\\s\\S]*?</array>|<array\\s*/>|<true\\s*/>|<false\\s*/>|<string>[^<]*</string>)');
  if (re.test(xml)) return xml.replace(re, (_, k) => k + plistValue(value));
  const end = xml.lastIndexOf('</dict>');
  if (end < 0) throw new Error('Info.plist has no top-level dict.');
  return xml.slice(0, end) + '\t<key>' + key + '</key>\n\t' + plistValue(value) + '\n' + xml.slice(end);
}
export function patchInfoPlist(xml) {
  for (const [key, value] of Object.entries(PLIST)) xml = plistSet(xml, key, value);
  return xml;
}

/* The privacy manifest as a resource of the App target, beside Info.plist: a file reference, a build file, the App group's
   child and the Resources phase's entry, anchored on the Capacitor 8 template's own entries. null when an anchor is missing
   (a project changed by hand): add the file in Xcode instead (README). */
const PRIVACY_REF = '7A1E00000000000000F00001', PRIVACY_BUILD = '7A1E00000000000000F00002';
export function patchXcodeProject(pbx) {
  if (pbx.includes('PrivacyInfo.xcprivacy')) return pbx;
  const steps = [
    ['/* Begin PBXBuildFile section */\n', `\t\t${PRIVACY_BUILD} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${PRIVACY_REF} /* PrivacyInfo.xcprivacy */; };\n`],
    ['/* Begin PBXFileReference section */\n', `\t\t${PRIVACY_REF} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n`],
    [/\n(\t+)[0-9A-F]{24} \/\* Info\.plist \*\/,\n/, (m, tabs) => m + `${tabs}${PRIVACY_REF} /* PrivacyInfo.xcprivacy */,\n`],
    [/\n(\t+)[0-9A-F]{24} \/\* capacitor\.config\.json in Resources \*\/,\n/, (m, tabs) => m + `${tabs}${PRIVACY_BUILD} /* PrivacyInfo.xcprivacy in Resources */,\n`],
  ];
  for (const [anchor, add] of steps) {
    if (typeof anchor === 'string') {
      if (pbx.split(anchor).length !== 2) return null;
      pbx = pbx.replace(anchor, anchor + add);
    } else {
      if ((pbx.match(new RegExp(anchor.source, 'g')) || []).length !== 1) return null;
      pbx = pbx.replace(anchor, add);
    }
  }
  return pbx;
}

export function patchAndroidManifest(xml) {
  const activity = /<activity\b[^>]*android:name="\.MainActivity"[^>]*>/;
  if (!activity.test(xml)) throw new Error('AndroidManifest.xml has no .MainActivity.');
  xml = xml.replace(activity, tag => /android:screenOrientation="/.test(tag)
    ? tag.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="sensorLandscape"')
    : tag.replace(/<activity\b(\s*)/, (m, space) => '<activity' + (space || ' ') + 'android:screenOrientation="sensorLandscape"' + (space || ' ')));
  if (!/xmlns:tools="/.test(xml)) xml = xml.replace(/<manifest\b/, '<manifest xmlns:tools="http://schemas.android.com/tools"');
  if (!/com\.google\.android\.gms\.permission\.AD_ID/.test(xml)) xml = xml.replace(/\n?<\/manifest>\s*$/, '\n    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />\n</manifest>\n');
  return xml;
}

function update(file, patch, label) {
  const before = fs.readFileSync(file, 'utf8'), after = patch(before);
  if (after == null) return false;
  if (after !== before) fs.writeFileSync(file, after);
  console.log((after !== before ? 'Set ' : 'Already set: ') + label);
  return true;
}
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const plist = path.join(app, 'ios/App/App/Info.plist');
    if (fs.existsSync(plist)) {
      update(plist, patchInfoPlist, 'iOS Info.plist (landscape, no status bar, full screen, export compliance)');
      const privacy = path.join(app, 'ios/App/App/PrivacyInfo.xcprivacy');
      fs.copyFileSync(path.join(app, 'native/PrivacyInfo.xcprivacy'), privacy);
      if (!update(path.join(app, 'ios/App/App.xcodeproj/project.pbxproj'), patchXcodeProject, 'iOS privacy manifest in the App target')) {
        console.log('The Xcode project did not match the Capacitor template: in Xcode, drag ios/App/App/PrivacyInfo.xcprivacy into the App group with the App target ticked.');
      }
    } else console.log('No iOS project yet (npx cap add ios): skipped.');
    const manifest = path.join(app, 'android/app/src/main/AndroidManifest.xml');
    if (fs.existsSync(manifest)) update(manifest, patchAndroidManifest, 'Android manifest (landscape, no advertising ID)');
    else console.log('No Android project yet (npx cap add android): skipped.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
