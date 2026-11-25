# Setup & Install — Finding Myself (v0.1)

The app is an **installable web app (PWA)**. You open a link once in Chrome on your phone,
tap **Install**, and it lives on your home screen like any app — full screen, works offline.
Your data stays on the phone; backup goes to **your own Google Drive**.

There are three one-time steps. Steps 1–2 are done once by whoever runs the project; step 3 is per phone.

---

## Step 1 — Publish the app (GitHub Pages, free)

1. Merge the app into `main` (it's on branch `claude/beautiful-pasteur-40jd5n`).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow `.github/workflows/deploy-app.yml` builds and publishes on every push to `main`
   (or run it by hand: **Actions → Deploy app to GitHub Pages → Run workflow**).
4. Your app link will be: `https://<your-github-username>.github.io/Finding-myself/`

## Step 2 — Turn on Google Drive backup (Google Cloud, free)

The app needs a Google **OAuth Client ID** so Google knows which app is asking. It is *not* a password.

1. Go to <https://console.cloud.google.com/> → create a project, e.g. "Finding Myself".
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type: **External**. App name: Finding Myself. Support email: yours.
   - **Data access / Scopes** → add `https://www.googleapis.com/auth/drive.appdata`
     (this lets the app see **only its own hidden backup file**, never your other Drive files).
   - **Audience → Test users** → add the Gmail address(es) that will use the app.
     (While in "Testing", only these users can sign in. That's perfect for personal use.)
4. **Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - **Authorised JavaScript origins**: `https://<your-github-username>.github.io`
     (and `http://localhost:5173` if you'll develop locally).
   - No redirect URI needed. Create → copy the **Client ID** (`…apps.googleusercontent.com`).
5. On GitHub: **Settings → Secrets and variables → Actions → Variables → New variable**
   - Name: `GOOGLE_CLIENT_ID` · Value: the Client ID. Then re-run the deploy workflow.

(Alternative: paste the Client ID in the app under **More → Offline options → Google OAuth Client ID**.)

## Step 3 — Install on the phone

**Android (Chrome):** open the app link → menu **⋮ → Install app** (or "Add to Home screen").
**iPhone (Safari):** open the link → **Share → Add to Home Screen**.

Then in the app: **More → Back up now** → choose your Google account → allow.
On a new phone: install, finish the short welcome, then **More → Restore**.

---

## How backup works
- Backup file: `finding-myself-backup.json` in Drive's hidden **app data** folder for this app.
  You can see/delete it in Google Drive → ⚙️ Settings → **Manage apps**.
- Optional **backup passphrase** encrypts the file on the phone *before* upload (AES-256).
  Forget it = backup can't be opened, by anyone.
- The app reminds you if the last backup is older than 7 days.
- **Offline options**: save/restore a backup file manually.

## Local development
```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into app/dist
```
Put `VITE_GOOGLE_CLIENT_ID=…` in `app/.env.local` to test Drive backup locally.

## Later: Play Store app
The same code can be wrapped as an Android app (APK/AAB) with
[PWABuilder](https://www.pwabuilder.com/) (Trusted Web Activity) or Capacitor — no rewrite needed.
