import Foundation

let cases: [(String, BrowserPolicy.Decision)] = [
    ("https://www.instagram.com/direct/inbox/", .allow),
    ("https://www.instagram.com/direct/t/123/", .allow),
    ("https://www.instagram.com/accounts/login/?next=/direct/inbox/", .allow),
    ("https://www.instagram.com/example/", .allow),
    ("https://www.instagram.com/p/photo/", .allow),
    ("https://www.instagram.com/reel/123/", .reels),
    ("https://www.instagram.com/reels/", .reels),
    ("https://www.instagram.com/example/reels/", .reels),
    ("https://www.instagram.com/explore/", .reels),
    ("https://www.instagram.com/tv/123/", .reels),
    ("https://www.instagram.com/%72eel/123/", .reels),
    ("https://www.instagram.com/REELS/?source=dm", .reels),
    ("https://instagram.com.evil.example/direct/", .external),
    ("https://notinstagram.com/", .external),
    ("http://www.instagram.com/", .external),
    ("instagram://reels", .external),
    ("https://www.instagram.com:8443/", .external),
    ("https://user@www.instagram.com/", .external),
    ("https://www.facebook.com/", .external)
]
for (input, expected) in cases {
    precondition(BrowserPolicy.decision(for: URL(string: input)!) == expected, input)
}
print("Passed \(cases.count) navigation policy cases")
