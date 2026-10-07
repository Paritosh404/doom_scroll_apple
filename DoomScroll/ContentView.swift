import SwiftUI
import FamilyControls

struct ContentView: View {
    @StateObject private var screenTimeManager = ScreenTimeManager()
    @State private var selection = FamilyActivitySelection()
    @State private var showPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "nosign")
                    .font(.system(size: 72, weight: .semibold))

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

                Spacer()
            }
            .padding(24)
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
