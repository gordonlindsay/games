# Native project fixtures

Unchanged copies of the files `npx cap add ios` (Swift Package Manager template) and `npx cap add android` write, from
`@capacitor/cli` 8.6.0's `assets/ios-spm-template.tar.gz` and `assets/android-template.tar.gz` (MIT licence).
`node tools/native.mjs` runs `app/scripts/native-config.mjs` over them, so its changes are checked without Xcode or
Android Studio. Replace them when the Capacitor version in `app/package.json` changes.

- `Info.plist`: `App/App/Info.plist`
- `project.pbxproj`: `App/App.xcodeproj/project.pbxproj`
- `AndroidManifest.xml`: `app/src/main/AndroidManifest.xml`
