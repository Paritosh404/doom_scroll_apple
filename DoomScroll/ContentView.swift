import SwiftUI
import ReplayKit
import UIKit

struct ContentView: View {
    // Read the installed extension's identifier: a sideloading tool may rewrite it.
    private let extensionIdentifier = BroadcastPicker.extensionIdentifier

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label("ReplayKit prototype", systemImage: "record.circle")
                        .font(.headline)
                    Text("Start a screen broadcast to test local video-frame capture. This version does not detect or block Reels or Shorts.")
                }

                Section("Start a broadcast") {
                    if let extensionIdentifier {
                        HStack(spacing: 16) {
                            BroadcastPicker(extensionIdentifier: extensionIdentifier)
                                .frame(width: 60, height: 60)
                            Text("Tap the broadcast icon")
                                .font(.headline)
                        }
                        Text("Choose DoomScroll Broadcast, then tap Start Broadcast and wait for the countdown.")
                        Text("Open Instagram or YouTube. DoomScroll receives video frames locally and discards them; it does not save or upload your screen or process audio.")
                    } else {
                        Label("Broadcast extension missing", systemImage: "exclamationmark.triangle")
                        Text("Reinstall the complete IPA with its DoomScrollBroadcast extension included. If your installer asks whether to remove app extensions, keep them.")
                    }
                }

                Section("Stop a broadcast") {
                    Text("Tap the iOS recording indicator and choose Stop, or open Control Center and stop Screen Recording.")
                    Text("Use the iOS recording indicator to check whether capture is active. This screen does not track the extension's live status.")
                        .foregroundStyle(.secondary)
                }

                Section("Prototype details") {
                    Text("No Screen Time permission, Family Controls, VPN, or App Groups capability is requested.")
                    Text("Frame receipt is logged by the extension. On-device installation and broadcast startup still need testing with your free Apple ID.")
                    if let extensionIdentifier {
                        LabeledContent("Installed extension") {
                            Text(extensionIdentifier)
                                .font(.caption.monospaced())
                                .textSelection(.enabled)
                        }
                    }
                }
            }
            .navigationTitle("DoomScroll")
        }
    }
}

private struct BroadcastPicker: UIViewRepresentable {
    let extensionIdentifier: String

    static var extensionIdentifier: String? {
        guard let plugins = Bundle.main.builtInPlugInsURL,
              let bundle = Bundle(url: plugins.appendingPathComponent("DoomScrollBroadcast.appex")),
              let configuration = bundle.infoDictionary?["NSExtension"] as? [String: Any],
              configuration["NSExtensionPointIdentifier"] as? String == "com.apple.broadcast-services-upload"
        else { return nil }
        return bundle.bundleIdentifier
    }

    func makeUIView(context: Context) -> RPSystemBroadcastPickerView {
        let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 60, height: 60))
        picker.preferredExtension = extensionIdentifier
        picker.showsMicrophoneButton = false
        return picker
    }

    func updateUIView(_ picker: RPSystemBroadcastPickerView, context: Context) {
        picker.preferredExtension = extensionIdentifier
        picker.showsMicrophoneButton = false
    }
}

#Preview {
    ContentView()
}
