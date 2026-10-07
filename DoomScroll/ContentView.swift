import SwiftUI
import FamilyControls

struct ContentView: View {
    @StateObject private var screenTimeManager = ScreenTimeManager()
    @State private var selection = FamilyActivitySelection()
    @State private var showPicker = false
    @State private var copiedDiagnostics = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Image(systemName: "nosign")
                        .font(.system(size: 72, weight: .semibold))
                        .padding(.top, 28)

                    VStack(spacing: 8) {
                        Text("DoomScroll")
                            .font(.largeTitle.bold())

                        Text("Block distracting short-form content")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    VStack(spacing: 12) {
                        Button {
                            Task {
                                await screenTimeManager.requestAuthorization()
                            }
                        } label: {
                            Label("Enable Protection", systemImage: "lock.shield")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                        }
                        .buttonStyle(.borderedProminent)

                        Button {
                            showPicker = true
                        } label: {
                            Label("Choose Apps", systemImage: "app.badge.checkmark")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                        }
                        .buttonStyle(.bordered)
                        .disabled(screenTimeManager.authorizationStatus != .approved)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Label(screenTimeManager.authorizationMessage, systemImage: statusIcon)
                            .font(.footnote)

                        Text("Selected apps: \(selection.applicationTokens.count)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Label("Diagnostics", systemImage: "stethoscope")
                                .font(.headline)

                            Spacer()

                            Button {
                                screenTimeManager.refreshDiagnostics()
                            } label: {
                                Image(systemName: "arrow.clockwise")
                            }
                            .accessibilityLabel("Refresh diagnostics")
                        }

                        Text(screenTimeManager.diagnostics)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        Button {
                            UIPasteboard.general.string = screenTimeManager.diagnostics
                            copiedDiagnostics = true
                        } label: {
                            Label(copiedDiagnostics ? "Copied" : "Copy Diagnostics",
                                  systemImage: copiedDiagnostics ? "checkmark" : "doc.on.doc")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(16)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))

                    Text("Diagnostic output contains app/build status and the authorization error. It does not include your selected apps.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 24)
                }
                .padding(.horizontal, 24)
            }
            .navigationTitle("Protection")
            .familyActivityPicker(isPresented: $showPicker, selection: $selection)
        }
    }

    private var statusIcon: String {
        switch screenTimeManager.authorizationStatus {
        case .approved:
            return "checkmark.circle.fill"
        case .denied:
            return "xmark.circle.fill"
        case .notDetermined:
            return "questionmark.circle"
        @unknown default:
            return "exclamationmark.triangle"
        }
    }
}

#Preview {
    ContentView()
}
