import Foundation
import FamilyControls

@MainActor
final class ScreenTimeManager: ObservableObject {
    @Published var authorizationStatus: AuthorizationStatus = AuthorizationCenter.shared.authorizationStatus
    @Published var authorizationMessage: String = "Screen Time access is not authorized yet."

    func requestAuthorization() async {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            authorizationStatus = AuthorizationCenter.shared.authorizationStatus
            authorizationMessage = authorizationStatus == .approved
                ? "Screen Time access authorized."
                : "Authorization completed with status: \(authorizationStatus)"
        } catch {
            authorizationStatus = AuthorizationCenter.shared.authorizationStatus
            authorizationMessage = "Authorization failed: \(error.localizedDescription)"
        }
    }
}
