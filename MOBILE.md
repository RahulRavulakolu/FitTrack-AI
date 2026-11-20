# FitTrack AI for Android and iPhone

FitTrack AI is packaged as a Capacitor mobile application. Its interface and exercise images are bundled in the app; Java/Kotlin and Swift plugins provide camera, photo selection, secure session storage, file export and system sharing. It does not open a hosted website to render its screens. Account data is stored by the Express/MongoDB backend, so a working server connection is required. Offline tracking and background synchronization are not implemented.

## Install the Android app

For laptop-independent hosting on Azure, see [AZURE.md](AZURE.md). After deployment and verification, use `https://api.rahulravulakola.tech` in the existing app's server settings. The domain is a proposed endpoint, not a live service yet. The steps below describe the existing local testing setup.

1. Copy `releases/FitTrack-AI-Android.apk` to your Android phone and open it. Allow installation from the file manager you use when Android asks. This is a development APK signed with the local Android debug key, suitable for testing; it is not a Play Store release.
2. On this Windows computer, double-click `Start-FitTrack-Server.cmd`. It starts the API or reports that an existing server is already running. Keep the running server window open.
3. Connect your phone and computer to the same Wi-Fi. In the phone app, enter the Wi-Fi address printed by the launcher, such as `http://192.168.0.6:4000`. The address can change when you reconnect to Wi-Fi. Do not enter `localhost` on a physical phone: that points to the phone itself.
4. Tap **Connect & continue**, then create an account or sign in. Records are shared with the desktop version when both use this backend.

Android 8.0/API 26 or later and a current Android System WebView are required. Health Connect needs Android 9 or later and an available Health Connect provider. If using a USB-connected phone for development, `adb reverse tcp:4000 tcp:4000` permits `http://localhost:4000` instead of Wi-Fi. No Android device was connected to the build tools during this build.

If connection fails, open `http://<computer-ip>:4000/api/health` in the phone's browser; a ready server returns `{"status":"ok"}`. Check the printed IP, Wi-Fi client isolation and Windows Firewall. If Windows requests permission for Node.js, allow your trusted private network. The launcher does not change firewall rules. In-app server connection settings are available beside sign-in and in the signed-in top bar. Changing the server clears the locally stored login.

If the server was started inside a coding agent's restricted execution session, it can respond on the computer while connections from the phone time out. Stop that server, then launch `Start-FitTrack-Server.cmd` directly from Windows Explorer, or restart `npm run dev` with approved local-network access outside the restricted session. Do not run two servers against the same local database. This resolved the phone connection timeout during setup, and the user confirmed that the sign-in screen opened. An app reinstall was not required.

For use away from your computer, deploy the API to an HTTPS host using [README.md](README.md), then enter that public origin in the app. Optional hosted database/photos/email use MongoDB Atlas, Cloudinary and SMTP. AI uses a free model running locally on the API server computer; choose hardware capable of running it. No paid LLM provider or API key is used. See [LOCAL_AI.md](LOCAL_AI.md).

## Rebuild Android

```powershell
npm ci
# First machine setup only: downloads verified JDK/SDK and accepts Android SDK licenses.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-android.ps1
npm run mobile:icons
npm run mobile:android
```

The build command builds/syncs the current frontend, runs Gradle `assembleDebug`, and copies the APK and its SHA-256 file into `releases/`. Download caches, toolchains and local databases stay under `.data/`. Native source is under `android/`. The application ID is `com.fittrack.ai`; version code 2, version name 1.1. Install this APK over version 1.0 to retain your server and session settings. The debug build permits HTTP for local testing; release builds require HTTPS. Use HTTPS for accounts containing real personal data.

## Steps from Health Connect

On Android, open **Home → Keep moving → Connect Health Connect** and grant read access to steps. The app imports the last seven days when you connect or tap **Sync now**, and today's count once a minute while Home is open or when you return to it. No background-health permission is requested. Health Connect is built into Android 14+; supported older phones may need the Health Connect app from Google Play.

The aggregate API combines eligible data sources according to Health Connect priorities. Repeated imports replace daily step totals rather than adding to them. Manual distance, active minutes and calories are preserved; they are not guessed from step counts. Health Connect step values cannot be overwritten by the manual activity form. Dates follow the account's timezone.

Some current Android versions count steps directly through Health Connect; other devices need a compatible fitness app or watch to share steps into it. A successful connection with no data is displayed as no step records, not a broken integration. Disconnect stops app syncing, while the Permissions button lets you revoke Android access. Previously synced totals stay in your account until removed through account deletion. The native permission/privacy screen explains these rules. Play Store distribution requires a Health Connect permission declaration and the matching published privacy policy. Android step permission and aggregation still need validation on a physical supported phone.

For Play Store distribution, choose an application ID you control, configure a private upload keystore using Android Studio's **Generate Signed App Bundle**, and build a release AAB. Store signing secrets outside the repository. Increment the version code for each update. Add your privacy-policy URL and complete the store's data-safety disclosures according to your deployed services. Nothing has been uploaded to Google Play.

## Build the iPhone app on a Mac

The iOS project is `ios/App/App.xcodeproj`, included with the complete source in `releases/FitTrack-AI-iOS-Project.zip`. It targets iOS 15 or later. **The iPhone project has not been compiled on this Windows host.** An installable signed IPA needs Xcode on macOS and an Apple signing identity; App Store/TestFlight distribution also needs Apple Developer membership.

1. Extract the source archive on a Mac. Install Node.js 24+ and the Xcode version required by Capacitor 8 (Xcode 26+), then open Xcode once to install its platform support and accept its license.
2. In the extracted project root, run:

   ```sh
   npm ci
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

3. Let Xcode resolve the Swift packages. Dependencies are generated in `ios/App/CapApp-SPM/Package.swift`; retain the project root and `node_modules` next to `ios` so the local package paths resolve. CocoaPods is not required.
4. In the **App** target, select your development team in **Signing & Capabilities** and choose a bundle identifier your team controls. Select an iPhone or simulator and run. Use an HTTPS backend where possible; local network access prompts are configured for development.
5. For device distribution choose **Any iOS Device → Product → Archive**, then use Organizer to distribute through TestFlight or your authorized method. Complete privacy details for account email/name, fitness/body information, photos, AI opt-in data and any configured cloud storage. Review `PrivacyInfo.xcprivacy` for your final dependency set.

The Swift secure-session plugin is registered by `FitTrackViewController`, which is used by both the scene delegate and storyboard. The plugin stores opaque tokens in Keychain with `AfterFirstUnlockThisDeviceOnly`. Camera/photo descriptions and the required UserDefaults/FileTimestamp privacy reasons are included. Neither Apple signing credentials nor provisioning profiles are present.

## Native behavior and verification

- UI assets are packaged locally; there is no remote live-reload URL in the shipped Capacitor configuration.
- Native API calls use the HTTP bridge, bearer sessions and `X-FitTrack-Native`. Web sessions remain HTTP-only cookies. The server hashes tokens and scopes all data to the owner. Mobile sessions ignore browser-cookie fallback.
- Android session values are encrypted with an AES-GCM key held in Android Keystore. iPhone sessions use Keychain. Tokens are not stored in JavaScript localStorage or Capacitor Preferences.
- Password-reset requests from the phone create `fittrack://reset-password` links. In development, open the generated message from `.data/mail` and transfer its link to the phone. Hosted email requires SMTP.
- Camera permission is requested when used; selected/taken images still go through preview/crop and explicit confirmation. Cancelling a native picker leaves saved records unchanged.
- No push notification or offline queue is implemented; reminders are in-app only. Android Health Connect imports are described above.

Run `npm test`, `npm run build` and, with `npm run dev` running, `npm run test:e2e`. The automated suite covers domain rules, API journeys, mobile session issuance/revocation, origin validation and server-address restrictions. Browser journeys cover account creation, onboarding, nutrition, workout sets, progress, photos and mobile layouts. Browser tests do not validate the native bridge. Physical Android/iPhone camera, Keychain/Keystore persistence, share-sheet and device layout checks still require a connected device or emulator.

The APK should be checked with Android SDK `apksigner verify` and `aapt dump badging`. See `releases/BUILD-VERIFICATION.txt` for this build's recorded checks. The iOS source archive intentionally excludes user databases/photos/mail, environment secrets, local SDKs, signing files and dependency caches.
