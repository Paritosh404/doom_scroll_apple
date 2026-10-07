# DoomScroll — ReplayKit prototype

Version 0.2 captures screen video through an embedded Broadcast Upload Extension.
It counts frames locally for diagnostics and discards every buffer. It does not
save or upload screen content, process audio, detect Reels/Shorts, or block apps.

## Build

On a Mac with Xcode and XcodeGen installed:

```sh
xcodegen generate
xcodebuild -project DoomScroll.xcodeproj -scheme DoomScroll \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS="" build
python3 scripts/verify_bundle.py build/DerivedData/Build/Products/Release-iphoneos/DoomScroll.app
```

The checked-in Info.plist files are authoritative; XcodeGen does not rewrite them.
Both targets share their version/build settings. No Family Controls, Network
Extension, App Groups, or custom entitlements are configured.

GitHub Actions builds on macOS, checks the extension's executable and processed
metadata inside DoomScroll.app/PlugIns, packages the unsigned IPA, then extracts
and verifies that IPA before uploading the artifact.

## iPhone smoke test with a free Apple ID

1. Download the successful run's DoomScroll-unsigned-ipa artifact and unzip it.
2. Sideload DoomScroll-unsigned.ipa using your free Apple ID and AltStore.
   Keep the app extension if the installer offers to remove extensions.
   The IPA is unsigned; the sideloading tool must sign both the app and extension.
3. Open DoomScroll. Confirm the installed extension identifier appears.
4. Tap the broadcast icon, choose DoomScroll Broadcast, then Start Broadcast.
5. Wait for the countdown and confirm the iOS recording indicator remains active.
6. Open Instagram or YouTube, then stop capture using the iOS recording
   indicator or Control Center.
7. If a Mac is available, inspect connected-device Console logs for the
   DoomScrollBroadcast process / com.paritosh404.doomscroll.broadcast subsystem.
   Expect Broadcast started, Received 1 video frames, periodic frame counts,
   and Broadcast finished. Screen contents are never logged.

The picker discovers the embedded extension's installed bundle identifier so it
can follow identifiers rewritten during sideloading. Its presence does not prove
that the extension launched. Live status comes from iOS; the host app does not
claim to track capture across processes.

Free-account provisioning and ReplayKit startup must be confirmed on a physical
iPhone. CI verifies compilation and packaging, not installation or runtime
behavior. This prototype requests no paid Apple Developer capabilities.
No system-wide shielding or overlay is implemented.

## Apple API references

- [System broadcast picker](https://developer.apple.com/documentation/replaykit/rpsystembroadcastpickerview)
- [Sample-buffer handler](https://developer.apple.com/documentation/replaykit/rpbroadcastsamplehandler)
