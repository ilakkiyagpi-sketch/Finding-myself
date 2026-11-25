# Android App — build, install, Google Drive backup

The real app is the **Expo (React Native) app in `mobile/`**. It installs as a normal Android
app from an APK file — **no Play Store**. Your data lives in the app's private storage on the
phone; backups go to a hidden app folder in **your own Google Drive**.

> `app/` is the earlier web (PWA) version of the same features. It can stay as a browser
> fallback or be deleted.

---

## One-time setup (≈ 20 minutes)

### 1. Add the signing key to GitHub (4 secrets)
Every Android app must be signed, and every update must use the **same** key.
A key was generated for you (files: `finding-myself-release.jks` + `SIGNING-KEY-README.txt`).
**Keep both files safe forever** (e.g. a private Drive folder) — they are not in the repo.

GitHub → repo → **Settings → Secrets and variables → Actions → Secrets → New repository secret**:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the whole content of `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | from `SIGNING-KEY-README.txt` |
| `ANDROID_KEY_ALIAS` | `findingmyself` |
| `ANDROID_KEY_PASSWORD` | from `SIGNING-KEY-README.txt` |

### 2. Google Cloud — allow the app to use your Drive (free)
1. <https://console.cloud.google.com/> → **New project** "Finding Myself".
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **OAuth consent screen / Google Auth Platform**
   - User type **External**, app name *Finding Myself*, your email as support contact.
   - **Data access → Add scope** `https://www.googleapis.com/auth/drive.appdata`
     (the app can see **only its own backup file**, never your other Drive files).
   - **Audience → Test users** → add the Gmail address(es) that will use the app.
     Leaving the app in *Testing* is fine for personal use.
4. **Credentials → Create credentials → OAuth client ID → Android**
   - Package name: `com.findingmyself.app`
   - SHA-1 certificate fingerprint: `7A:44:A0:BB:87:FC:54:DB:A2:94:CB:FF:87:6B:F5:44:67:F2:BD:5D`
   - Create. (Nothing to copy into the app — Google matches the app by package + SHA-1.)

### 3. Build the APK
- Merge the work into `main` **or** run it by hand:
  GitHub → **Actions → Build Android APK → Run workflow**.
- It takes ~15–25 minutes. When it's green, a release called **latest-apk** appears
  (repo home page → *Releases*). The file is also kept as a workflow artifact.

## Install on the phone
1. On the Android phone, open the repo's **Releases → latest-apk** page and tap `finding-myself.apk`.
2. Android asks to allow installs from this source (Chrome / Files) → **Allow** → **Install**.
   Play Protect may warn that the app is unknown (it isn't from the Play Store) → *Install anyway*.
3. Open **Finding Myself** → finish the welcome → **More → Back up now** → pick your Google account → allow.

**Updates:** no reinstall needed. Each build gets a higher version number and the same signing key,
so it installs *over* the old app and all entries stay. The app checks for a new build on launch
(at most every 6 hours) and shows **"A new version is ready 🌱 · Update"** on Home; tapping it
downloads the APK and Android offers **Update**. You can also check by hand in **More → App updates**.
(The check reads a small `version.json` published beside the APK on the `latest-apk` release.)

The APK is built for 64-bit ARM phones (practically every Android phone since ~2017).

**New phone:** install the APK → on the welcome screen tap
*"I already have a backup — restore it"* → sign in → restore.

---

## How data & backup work
| What | Where |
|---|---|
| All entries | One JSON file in the app's private folder (other apps can't read it). Saved safely (write-then-swap). |
| Google backup | `finding-myself-backup.json` in Drive's hidden *app data* folder. See/delete it: Google Drive → ⚙️ Settings → **Manage apps**. |
| Passphrase (optional) | Encrypts the backup on the phone before upload (AES-256-GCM, PBKDF2). Forgotten passphrase = backup can't be opened. |
| Offline | **More → Offline options** → save / restore a backup file. |

Backups made by the web version (`app/`) can be restored in the Android app (same format).

## Troubleshooting
- **"Google backup isn't set up for this app build (… SHA-1 mismatch)"** → the Android OAuth
  client's package/SHA-1 doesn't match, or the APK was built without the signing secrets
  (the workflow prints a warning in that case).
- **"Access blocked / app not verified"** → add your Gmail under *Test users* (step 2.3).
- **Can't install over the old app** → the old one was signed with a different key; back up,
  uninstall, install, restore.

## Developing
```bash
cd mobile
npm install
npx expo start --web     # quick UI preview in a browser (Google backup is Android-only)
npx tsc --noEmit         # type-check
```
For on-device development, build a debug APK the same way as the workflow
(`npx expo prebuild -p android` then `cd android && ./gradlew assembleDebug`) on a machine
with Android Studio, or use EAS Build (`npx eas-cli build -p android --profile preview`) with a free Expo account.
