# DoomScroll — Instagram focus browser

Version 0.4 restores Stories and media playback. Messages open first. The Following
button requests Instagram's Following feed (`/?variant=following`) so users can
see posts and Reels from accounts they follow. Root/home links request this view
as well. Following is supplied by Instagram, not a locally verified follower
allowlist; availability and the contents of that feed are controlled by Instagram.
There is no silent fallback to the recommended feed.

## One post at a time

A specific Reel or post permalink (`/reel/CODE/`, `/reels/CODE/`, `/p/CODE/`,
or `/tv/CODE/`) opens a standalone document locked to that code. This includes
Reels shared in DMs and Reels opened from Following. In that document:

- Swipe, wheel, keyboard scrolling and scroll-container movement are stopped.
- Native navigation and JavaScript history updates reject a different post code.
- Next-post links and labeled next/previous post controls are disabled.
- Only the first video element can play; additional/recycled players are paused.
- Playback ending does not trigger the page's auto-advance handler.
- A Done button returns to the prior page so another post can be chosen manually.

The lock applies to individual photo post permalinks too. Following-feed scrolling,
message-list scrolling, and Story gestures remain available. Stories and DMs are
not subject to the single-post media lock. The old global media request block and
blanket video/audio hiding have been removed. Calls still have no microphone/camera
permission; background push notifications are not provided.

## Limitations and testing

This is website filtering, not an Instagram API integration or a system-wide block.
Instagram markup, routes, and player behavior can change. The first video in an
individual post document is treated as that post's video. If Instagram replaces
that player or changes its media source, playback stops conservatively; Reload
reopens the selected post. Following requests do not independently prove that
every item Instagram returns is from a followed account.

CI checks navigation policy, synthetic DOM/history/media cases, compilation, and
IPA packaging. It does not validate the current authenticated Instagram DOM.
The prior version's login and messaging were confirmed by the user; v0.4 Stories,
Following, and single-Reel behavior still need physical-iPhone validation.

Install the latest successful `DoomScroll-unsigned-ipa` artifact using AltStore.
There is no recording extension and no paid entitlement. Test:

1. Play both photo and video Stories; swipe to the next Story.
2. Open Following and play a followed account's video in the feed.
3. Open a Reel from a message, play/pause it, and try swiping to another Reel.
4. Let it end; verify no next Reel starts. Tap Done and open a different shared Reel.
5. Test a Reel permalink that uses `/p/`, back navigation, reload, and profile links.
6. Confirm the Reels browsing tab, profile Reels grid, and Explore remain blocked.

Login and website data stay in persistent WebKit storage. Instagram handles the
login and messaging; DoomScroll has no separate backend, does not read passwords
or message text, and does not log page HTML. About > Clear login removes local
website data. Facebook sign-in and external top-level sites remain unsupported.
This app is not affiliated with Instagram or Meta.

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
