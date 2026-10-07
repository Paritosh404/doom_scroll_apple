import Foundation

let cases: [(String, BrowserPolicy.Decision)] = [
    ("https://www.instagram.com/direct/inbox/", .allow),
    ("https://www.instagram.com/direct/t/123/", .allow),
    ("https://www.instagram.com/accounts/login/?next=/direct/inbox/", .allow),
    ("https://www.instagram.com/example/", .allow),
    ("https://www.instagram.com/p/photo/", .allow),
    ("https://www.instagram.com/reel/ABC_123/", .allow),
    ("https://www.instagram.com/reels/ABC_123/", .allow),
    ("https://www.instagram.com/tv/ABC_123/", .allow),
    ("https://www.instagram.com/stories/person/123/", .allow),
    ("https://www.instagram.com/stories/highlights/123/", .allow),
    ("https://www.instagram.com/reels/", .reels),
    ("https://www.instagram.com/example/reels/", .reels),
    ("https://www.instagram.com/explore/", .allow),
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
for route in ["reel", "reels", "p", "tv"] {
    let same = URL(string: "https://www.instagram.com/\(route)/ABC_123/?source=dm")!
    let next = URL(string: "https://www.instagram.com/\(route)/NEXT/")!
    precondition(BrowserPolicy.decision(for: same, lockedPostID: "ABC_123") == .allow)
    precondition(BrowserPolicy.decision(for: next, lockedPostID: "ABC_123") == .reels)
}
precondition(BrowserPolicy.feed.absoluteString == "https://www.instagram.com/")
print("Passed navigation, normal Home, Stories, and permalink checks")
