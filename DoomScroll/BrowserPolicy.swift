import Foundation

enum BrowserPolicy {
    static let inbox = URL(string: "https://www.instagram.com/direct/inbox/")!
    static let feed = URL(string: "https://www.instagram.com/")!

    enum Decision: Equatable {
        case allow, reels, external
    }

    static func decision(for url: URL) -> Decision {
        guard url.scheme?.lowercased() == "https",
              let host = url.host?.lowercased(),
              host == "instagram.com" || host.hasSuffix(".instagram.com"),
              url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return .external }
        let path = (url.path.removingPercentEncoding ?? url.path).lowercased()
        let components = path.split(separator: "/").map(String.init)
        if components.contains(where: { ["reel", "reels", "tv", "explore"].contains($0) }) {
            return .reels
        }
        return .allow
    }
}
