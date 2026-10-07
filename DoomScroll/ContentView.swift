import SwiftUI

struct ContentView: View {
    @StateObject private var browser = InstagramBrowser()
    @State private var showInfo = false
    @State private var confirmReset = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("DoomScroll").font(.headline)
                    Label("instagram.com · Focus browser", systemImage: "lock.fill")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Button { showInfo = true } label: {
                    Image(systemName: "info.circle").font(.title3)
                }
                .accessibilityLabel("About this browser")
            }
            .padding(.horizontal).padding(.vertical, 10)
            Divider()

            if browser.singlePostID != nil {
                HStack {
                    Label("One post · scrolling off", systemImage: "hand.raised")
                        .font(.caption)
                    Spacer()
                    Button("Done") {
                        if browser.canGoBack { browser.back() }
                        else { browser.open(BrowserPolicy.inbox) }
                    }
                }
                .padding(10).background(Color.accentColor.opacity(0.1))
            }

            if let notice = browser.notice {
                HStack {
                    Text(notice).font(.caption)
                    Spacer()
                    Button { browser.notice = nil } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Dismiss notice")
                }
                .padding(12)
                .background(Color.orange.opacity(0.12))
            }

            ZStack {
                InstagramWebView(browser: browser)
                if let error = browser.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                        Text(error).multilineTextAlignment(.center)
                        Button("Retry") { browser.reload() }.buttonStyle(.borderedProminent)
                    }
                    .padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.background)
                } else if !browser.ready {
                    ProgressView("Preparing your browser")
                }
            }
            .overlay(alignment: .top) {
                if browser.loading { ProgressView().padding(8).background(.regularMaterial, in: Capsule()) }
            }

            Divider()
            HStack {
                Button { browser.open(BrowserPolicy.inbox) } label: {
                    Label("Messages", systemImage: "bubble.left.and.bubble.right")
                }
                Spacer()
                Button { browser.open(BrowserPolicy.feed) } label: {
                    Label("Following", systemImage: "person.2")
                }
                Spacer()
                Button { browser.back() } label: { Image(systemName: "chevron.left") }
                    .disabled(!browser.canGoBack).accessibilityLabel("Go back")
                Button { browser.reload() } label: { Image(systemName: "arrow.clockwise") }
                    .padding(.leading, 16).accessibilityLabel("Reload Instagram")
            }
            .font(.subheadline).padding()
            .disabled(!browser.ready)
        }
        .sheet(isPresented: $showInfo) {
            NavigationStack {
                List {
                    Section("Instagram, with less scrolling") {
                        Text("Messages open first. Following opens Instagram's feed for accounts you follow. Stories, photos, and videos can play.")
                        Text("Open a shared Reel or a post from Following to watch it individually. Swiping, scrolling, and next-post navigation are disabled in the post viewer. Tap Done to return and choose another.")
                        Text("No screen recording. No paid Apple Developer capabilities.")
                    }
                    Section("Your account") {
                        Text("Login stays in this app's website storage. DoomScroll does not read or send your password or messages to a separate server.")
                        Text("Use your Instagram login. Facebook sign-in and links to other apps or websites are not supported.")
                        Button("Clear login and website data", role: .destructive) {
                            confirmReset = true
                        }
                    }
                    Section("Website support") {
                        Text("Instagram controls Following feed availability. If it does not load, choose Following from Instagram's own menu. DoomScroll does not verify your follower list. Calls and background message notifications are not provided.")
                        Text("Filters apply only inside DoomScroll. Instagram website updates can require filter updates. This app is not affiliated with Instagram or Meta.")
                    }
                }
                .navigationTitle("About DoomScroll")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showInfo = false } } }
                .confirmationDialog("Clear your Instagram login on this device?", isPresented: $confirmReset) {
                    Button("Clear login", role: .destructive) {
                        showInfo = false
                        browser.clearLogin()
                    }
                }
            }
        }
    }
}
