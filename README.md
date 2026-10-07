# DoomScroll — Instagram focus browser

Version 0.5.3 removes the persistent app header and bottom navigation. A compact
ellipsis menu provides Home, Messages, Back, Reload, and settings. The player has
one Close control and no separate sound toolbar. New playback defaults to sound
on; the video's native controls can still mute. If WebKit requires a user gesture,
tap its built-in play control. Earlier version notes below describe prior UI.

Version 0.5.1 fixes the message-preview path: a tap on a large media thumbnail
arms a short-lived selection intent. A video inserted or expanded by Instagram's
message viewer is then moved into the existing single-video player, even when
the URL stays unchanged or uses a Story-like route. The intent is retained across
document navigation, expires after 15 seconds, and is cleared after capture.
Close returns to the originating conversation. No message text is inspected.

Four additional browser regressions cover delayed DM viewers, Story-like routes,
early pointer-down navigation, and incoming videos without a user selection.
Live Instagram/iPhone verification is still required for this patch.

Version 0.5 restores the normal Instagram homepage as the startup page and Home
button destination. No Following redirect or Stories-row filtering is applied.
Messages, photos, profiles, Explore, and Stories retain Instagram's web layout.
The standalone Reels browsing tab remains blocked.

## Single-video player

The previous CSS-only restriction did not reliably stop Instagram's Reel viewer.
This version moves the selected video element into a modal dialog with a separate
Shadow DOM layout. Instagram's suggestions and nested scroll containers stay
behind the modal instead of sharing the playback surface.

- Tapping a video on Home or in messages opens that particular video.
- A swipe begun on an inline video opens the player and cancels the swipe.
  Swiping other page areas scrolls Home/messages normally.
- Shared Reel permalinks load the selected post, then isolate its primary video.
- The player fits the WebView width/height with object-fit: contain, including
  rotation. No clipping/overflow rule is applied to the normal Instagram page.
- Play with sound explicitly unmutes the video in a user gesture. The native app
  configures its audio session for media playback.
- There is no next-video control or scrollable recommendation surface in the
  modal. Navigation, SPA history changes, and page media playback are stopped
  while it is open. Native WebView scrolling/gestures are disabled too.
- Source changes stop the selected player conservatively. Close and reopen if
  Instagram replaces the media source.
- Close restores an inline video to its original place; closing a permalink
  returns through the native browser history (or Home if history is empty).
- Story gestures and playback are untouched.

## Verification and limitations

The Playwright suite uses real browser DOM, layout, and media playback on synthetic
Instagram-like pages, with an intentionally oversized video, a real generated
audio track, Stories, a second suggested video, and nested page content. CI runs
it in WebKit in addition to compiling the native app and checking IPA packaging.
Local Chromium tests also pass. These tests do not authenticate to Instagram and
are not proof that every live Instagram layout or media format works.

Instagram may change its DOM or use media sources that are replaced dynamically.
The player reuses the actual video element (including blob-backed media) rather
than downloading it or sending it to a server. Site-owned code can still hold
references to that element; this is a best-effort website integration, not a
security boundary. Physical-iPhone testing of this release remains required.

After installing the latest successful DoomScroll-unsigned-ipa artifact:

1. Verify the normal Home feed and Stories row appear.
2. Open photo/video Stories and swipe between them.
3. Open a shared Reel in messages. Confirm it fits in portrait and landscape.
4. Tap Play with sound, then test pause/replay and the phone's media volume.
5. Try scrolling/swiping to suggestions; only the selected video should remain.
6. Close it. Confirm normal Home/message scrolling is restored.
7. Repeat by tapping or swiping a Reel preview on Home.

Login remains in persistent WebKit website storage. DoomScroll has no separate
backend, does not read passwords or message text, and does not log page HTML.
About > Clear login removes local website data. Facebook sign-in, external
top-level sites, calls, and background push notifications remain unsupported.
No screen recording or paid Apple Developer entitlements are configured.
This app is not affiliated with Instagram or Meta.

## Build and verification

On macOS with Xcode and XcodeGen:

```sh
xcodegen generate
swiftc DoomScroll/BrowserPolicy.swift tests/main.swift -o /tmp/browser-policy-tests
/tmp/browser-policy-tests
npm install --no-save --package-lock=false playwright@1.58.2
npx playwright install webkit
node --test tests/filter.test.cjs
xcodebuild -project DoomScroll.xcodeproj -scheme DoomScroll \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS="" build
python3 scripts/verify_bundle.py build/DerivedData/Build/Products/Release-iphoneos/DoomScroll.app
```

CI runs navigation and JavaScript tests, builds without signing, verifies the
bundled JavaScript and absence of app extensions, packages the unsigned IPA,
then extracts and verifies it again. Signing and physical-device behavior
are separate from CI. No paid Apple Developer entitlements are configured.

## References

- [Meta: Instagram web messaging](https://engineering.fb.com/2022/07/26/web/launching-instagram-messaging-on-desktop/)
- [Apple: WKNavigationDelegate](https://developer.apple.com/documentation/webkit/wknavigationdelegate)
