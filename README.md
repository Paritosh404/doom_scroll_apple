# DoomScroll — Instagram focus browser

Version 0.3 replaces screen broadcasting with an iOS WKWebView browser. It opens
Instagram's website at Messages. Profiles and photo posts remain accessible.
Reels, profile Reels tabs, legacy TV routes, and Explore are blocked inside the
browser. Inline video and audio are disabled, including shared videos in DMs.
There is no ReplayKit target, screen capture, VPN, or paid capability.

## What works by design

- Instagram owns the login page and handles messaging; there is no unofficial
  messaging API, credential scraping, or separate backend.
- Persistent WebKit website storage keeps your session across launches.
- Messages and Feed buttons, back navigation, reload, loading/error states,
  and an explicit clear-login control.
- Native navigation checks reject Reels routes, external top-level websites,
  and custom app schemes. Links stay inside the browser.
- A document-start script catches SPA history changes, shared Reel clicks,
  back/forward restoration, and dynamically inserted Reels links.
- A WebKit content rule blocks media requests; page CSS hides players and
  event handlers pause playback attempts. Photo resources remain enabled.
- The browser does not load Instagram until its filter resources are installed.

## Limits and device testing

This is a first prototype, not a verified replacement for every Instagram feature.
CI tests filtering logic and compiles/packages the app. An authenticated physical
iPhone test is still needed for login, two-factor checks, messages, and uploads.
Instagram may restrict embedded browsers or alter its markup/routes. Filters are
best-effort and can need updates; they are not a system-wide or tamper-proof block.

Use Instagram credentials on Instagram's own page. Facebook sign-in and external
websites are intentionally unsupported. Voice notes, calls, inline videos, and
background push notifications are not supported. Existing native Instagram apps
are unaffected. This app is not affiliated with Instagram or Meta.

## Install and test

1. Download the latest successful GitHub Actions artifact
   `DoomScroll-unsigned-ipa`, extract the IPA, and sideload with AltStore/free Apple ID.
   Version 0.3 contains only the main app, with no broadcast extension.
2. Open DoomScroll and sign in directly on Instagram, completing any login checks.
3. Confirm the inbox loads; open a conversation and send a test message yourself.
4. Open a profile or photo post; verify text, images, and messaging remain usable.
5. Try a shared Reel link, the Reels tab, a profile's Reels tab, and Explore.
   These should remain hidden or blocked. Try back/forward navigation as well.
6. Confirm video/audio players do not play, including media inside conversations.
7. Relaunch to test session persistence. Use About > Clear login and website data
   when you want to remove this app's local website session.

DoomScroll never logs message text, credentials, or page HTML. Its filter inspects
link destinations and media elements only; the app has no separate server.

## Build and verification

On macOS with Xcode and XcodeGen:

```sh
xcodegen generate
swiftc DoomScroll/BrowserPolicy.swift tests/main.swift -o /tmp/browser-policy-tests
/tmp/browser-policy-tests
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
