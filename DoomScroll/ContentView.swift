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
                    Label("Feed", systemImage: "photo")
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
                        Text("Sign in on Instagram's own website. Messages open first. You can also browse profiles and photo posts.")
                        Text("Reels and Explore links are blocked. Inline video and audio are disabled, including videos shared in messages. Voice notes and calls are not supported in this version.")
                        Text("No screen recording. No paid Apple Developer capabilities.")
                    }
                    Section("Your account") {
                        Text("Login stays in this app's website storage. DoomScroll does not read or send your password or messages to a separate server.")
                        Text("Use your Instagram login. Facebook sign-in and links to other apps or websites are not supported.")
                        Button("Clear login and website data", role: .destructive) {
                            confirmReset = true
                        }
                    }
                    Section("First version") {
                        Text("Instagram controls which web features are available. Login, messaging, and photo uploads still need testing on your iPhone. Background message notifications are not provided.")
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
