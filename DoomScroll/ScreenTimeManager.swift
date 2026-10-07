import Foundation
import FamilyControls
import UIKit

@MainActor
final class ScreenTimeManager: ObservableObject {
    @Published var authorizationStatus: AuthorizationStatus = AuthorizationCenter.shared.authorizationStatus
    @Published var authorizationMessage: String = "Screen Time access is not authorized yet."
    @Published var diagnostics: String = ""

    init() {
        refreshDiagnostics()
    }

    func requestAuthorization() async {
        refreshDiagnostics()

        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            authorizationStatus = AuthorizationCenter.shared.authorizationStatus
            authorizationMessage = authorizationStatus == .approved
                ? "Screen Time access authorized."
                : "Authorization completed with status: \(statusText(authorizationStatus))"
            refreshDiagnostics()
        } catch {
            authorizationStatus = AuthorizationCenter.shared.authorizationStatus

            let nsError = error as NSError
            authorizationMessage = "Authorization failed: \(nsError.localizedDescription)"
            refreshDiagnostics(error: nsError)
        }
    }

    func refreshDiagnostics(error: NSError? = nil) {
        authorizationStatus = AuthorizationCenter.shared.authorizationStatus

        var lines: [String] = [
            "DoomScroll diagnostics",
            "Bundle ID: \(Bundle.main.bundleIdentifier ?? "unknown")",
            "iOS: \(UIDevice.current.systemVersion)",
            "Authorization status: \(statusText(authorizationStatus))",
            "Provisioning profile present: \(provisioningProfilePresent ? "YES" : "NO")",
            "Family Controls marker in profile: \(familyControlsMarkerInProvisioningProfile ? "YES" : "NO")"
        ]

        if let error {
            lines.append("Error domain: \(error.domain)")
            lines.append("Error code: \(error.code)")
            lines.append("Error description: \(error.localizedDescription)")

            if !error.userInfo.isEmpty {
                let info = error.userInfo
                    .map { "\($0.key)=\(String(describing: $0.value))" }
                    .sorted()
                    .joined(separator: " | ")
                lines.append("Error userInfo: \(info)")
            }
        } else {
            lines.append("Error: none captured in this session")
        }

        diagnostics = lines.joined(separator: "\n")
    }

    private func statusText(_ status: AuthorizationStatus) -> String {
        switch status {
        case .approved:
            return "approved"
        case .denied:
            return "denied"
        case .notDetermined:
            return "notDetermined"
        @unknown default:
            return "unknown"
        }
    }

    private var provisioningProfileURL: URL? {
        Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision")
    }

    private var provisioningProfilePresent: Bool {
        provisioningProfileURL != nil
    }

    private var familyControlsMarkerInProvisioningProfile: Bool {
        guard
            let url = provisioningProfileURL,
            let data = try? Data(contentsOf: url),
            let marker = "com.apple.developer.family-controls".data(using: .utf8)
        else {
            return false
        }

        return data.range(of: marker) != nil
    }
}
