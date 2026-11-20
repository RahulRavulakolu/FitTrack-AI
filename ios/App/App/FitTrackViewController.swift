import Capacitor
import Security

@objc(SecureSessionPlugin)
public class SecureSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureSessionPlugin"
    public let jsName = "SecureSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]
    private func query() -> [String: Any] { return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.fittrack.ai.session", kSecAttrAccount as String: "session"] }
    @objc func write(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), token.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { call.reject("Invalid session token"); return }
        var item = query()
        SecItemDelete(item as CFDictionary)
        item[kSecValueData as String] = token.data(using: .utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        if SecItemAdd(item as CFDictionary, nil) == errSecSuccess { call.resolve() } else { call.reject("Could not securely store the session") }
    }
    @objc func read(_ call: CAPPluginCall) {
        var item = query(); item[kSecReturnData as String] = true; item[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        if SecItemCopyMatching(item as CFDictionary, &result) == errSecSuccess, let data = result as? Data, let token = String(data: data, encoding: .utf8) { call.resolve(["token": token]) } else { call.resolve(["token": NSNull()]) }
    }
    @objc func clear(_ call: CAPPluginCall) { SecItemDelete(query() as CFDictionary); call.resolve() }
}
class FitTrackViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(SecureSessionPlugin()) }
}
