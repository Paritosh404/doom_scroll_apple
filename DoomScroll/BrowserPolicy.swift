import Foundation

enum BrowserPolicy {
    static let inbox = URL(string: "https://www.instagram.com/direct/inbox/")!
    static let feed = URL(string: "https://www.instagram.com/")!

    enum Decision: Equatable { case allow, reels, external }

    static func postID(for url: URL) -> String? {
        let parts = url.path.split(separator: "/").map(String.init)
        guard parts.count == 2, ["p", "reel", "reels", "tv"].contains(parts[0].lowercased()),
              parts[1].range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil else { return nil }
        return parts[1]
    }

    static func decision(for url: URL, lockedPostID: String? = nil) -> Decision {
        guard url.scheme?.lowercased() == "https",
              let host = url.host?.lowercased(),
              host == "instagram.com" || host.hasSuffix(".instagram.com"),
              url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return .external }
        if let post = postID(for: url) {
            return lockedPostID == nil || lockedPostID == post ? .allow : .reels
        }
        let path = (url.path.removingPercentEncoding ?? url.path).lowercased()
        let components = path.split(separator: "/").map(String.init)
        if components.contains(where: { ["reel", "reels", "tv"].contains($0) }) {
            return .reels
        }
        return .allow
    }
}
