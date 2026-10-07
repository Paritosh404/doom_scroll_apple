import SwiftUI
import WebKit

@MainActor
final class InstagramBrowser: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var loading = false
    @Published var canGoBack = false
    @Published var errorMessage: String?
    @Published var notice: String?
    @Published var ready = false
    @Published private(set) var singlePostID: String?

    let webView: WKWebView
    private var observations: [NSKeyValueObservation] = []
    private var filtersInstalled = false
    private let scriptHandler = BrowserMessageHandler()

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        scriptHandler.owner = self
        configuration.userContentController.add(scriptHandler, name: "focusBrowser")
        observations = [
            webView.observe(\.isLoading, options: [.new]) { [weak self] view, _ in
                DispatchQueue.main.async { self?.loading = view.isLoading }
            },
            webView.observe(\.canGoBack, options: [.new]) { [weak self] view, _ in
                DispatchQueue.main.async { self?.canGoBack = view.canGoBack }
            }
        ]
        installFilters()
    }

    private func installFilters() {
        guard let url = Bundle.main.url(forResource: "InstagramFilter", withExtension: "js"),
              let script = try? String(contentsOf: url, encoding: .utf8) else {
            errorMessage = "The browsing filter is missing. Reinstall the latest build."
            return
        }
        webView.configuration.userContentController.addUserScript(
            WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        )
        // Media is allowed for Stories, messages, and Following posts.
        // The document script and navigation policy restrict single-post viewers.
        filtersInstalled = true
        ready = true
        open(BrowserPolicy.inbox)
    }

    func open(_ url: URL) {
        guard filtersInstalled else { return }
        guard BrowserPolicy.decision(for: url) == .allow else {
            showBlocked(BrowserPolicy.decision(for: url))
            return
        }
        errorMessage = nil
        notice = nil
        singlePostID = BrowserPolicy.postID(for: url)
        webView.load(URLRequest(url: BrowserPolicy.followingURL(for: url)))
    }

    func reload() {
        guard filtersInstalled else { return }
        errorMessage = nil
        if webView.url == nil { open(BrowserPolicy.inbox) }
        else { webView.reload() }
    }

    func back() {
        guard webView.canGoBack else { return }
        errorMessage = nil
        singlePostID = nil
        webView.goBack()
    }

    private func showBlocked(_ decision: BrowserPolicy.Decision) {
        notice = decision == .reels
            ? "Open one Reel at a time. Return to Messages or Following to choose another."
            : "This link leaves Instagram. Use Instagram login here; app links and outside websites stay closed."
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else {
            decisionHandler(.cancel)
            return
        }
        // Subframes may host Instagram's login/security checks, but no custom schemes.
        if action.targetFrame?.isMainFrame == false {
            decisionHandler(["https", "about"].contains(url.scheme ?? "") ? .allow : .cancel)
            return
        }
        let decision = BrowserPolicy.decision(for: url, lockedPostID: singlePostID)
        guard decision == .allow else {
            decisionHandler(.cancel)
            showBlocked(decision)
            return
        }
        let destination = BrowserPolicy.followingURL(for: url)
        if destination != url || action.targetFrame == nil || action.navigationType == .linkActivated {
            decisionHandler(.cancel)
            open(destination)
            return
        }
        singlePostID = BrowserPolicy.postID(for: url)
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        errorMessage = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
                 withError error: Error) {
        report(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        report(error)
    }

    private func report(_ error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled else { return }
        errorMessage = "Instagram could not load. Check your connection and try again."
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        errorMessage = "The browser was interrupted. Tap Retry to reopen Instagram."
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.deny)
    }

    func clearLogin() {
        webView.stopLoading()
        ready = false
        WKWebsiteDataStore.default().removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast
        ) { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                self.ready = self.filtersInstalled
                self.open(BrowserPolicy.inbox)
            }
        }
    }
}

private final class BrowserMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: InstagramBrowser?

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        let host = message.frameInfo.securityOrigin.host.lowercased()
        guard message.frameInfo.isMainFrame,
              host == "instagram.com" || host.hasSuffix(".instagram.com"),
              let event = message.body as? String, event == "blocked" else { return }
        DispatchQueue.main.async { [weak self] in
            self?.owner?.notice = "Open one Reel at a time. Return to Messages or Following to choose another."
        }
    }
}

struct InstagramWebView: UIViewRepresentable {
    @ObservedObject var browser: InstagramBrowser

    func makeUIView(context: Context) -> WKWebView { browser.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
