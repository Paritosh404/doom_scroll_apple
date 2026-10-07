import SwiftUI

struct ContentView: View {
    @StateObject private var browser = InstagramBrowser()
    @State private var showInfo = false
    @State private var confirmReset = false

    var body: some View {
        VStack(spacing: 0) {
            if !browser.playerActive {
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

            }

            if !browser.playerActive, let notice = browser.notice {
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

            if !browser.playerActive {
                Divider()
                HStack {
                    Button { browser.open(BrowserPolicy.inbox) } label: {
                        Label("Messages", systemImage: "bubble.left.and.bubble.right")
                    }
                    Spacer()
                    Button { browser.open(BrowserPolicy.feed) } label: {
                        Label("Home", systemImage: "house")
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
        }
        .sheet(isPresented: $showInfo) {
            NavigationStack {
                List {
                    Section("Instagram, with less scrolling") {
                        Text("Instagram's normal homepage opens first, including its Stories row. Home and Messages scroll normally.")
                        Text("Tap a video or a shared Reel to watch it in a separate player. Tap Play with sound for audio. There is no next-video feed in the player; close it to return.")
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
                        Text("Instagram controls which Stories and web features are available. Calls and background message notifications are not provided. The player may need updates when Instagram changes.")
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
