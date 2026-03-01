# URL to Google Drive — Setup Guide

This Chrome extension lets you paste any URL and save it to your Google Drive as a
self-redirecting HTML file. Click the file in Drive and it opens the original URL.

---

## Step 1 — Create a Google Cloud Project & OAuth Credentials

1. Go to https://console.cloud.google.com and sign in.
2. Click **Select a project → New Project**, give it a name (e.g. "URL to Drive"), click **Create**.
3. In the left menu go to **APIs & Services → Library**.
4. Search for **Google Drive API**, click it, then click **Enable**.
5. Go to **APIs & Services → OAuth consent screen**.
   - Choose **External**, click **Create**.
   - Fill in **App name** (e.g. "URL to Drive") and your email, click **Save and Continue** through all steps.
6. Go to **APIs & Services → Credentials**.
   - Click **+ Create Credentials → OAuth client ID**.
   - Application type: **Chrome extension**.
   - For **Item ID** — you'll fill this in after loading the extension (see Step 3 below).
   - Click **Create** and copy the **Client ID** shown (it ends in `.apps.googleusercontent.com`).

---

## Step 2 — Add Your Client ID to the Extension

Open `manifest.json` in this folder and replace `YOUR_CLIENT_ID.apps.googleusercontent.com`
with the Client ID you just copied:

```json
"oauth2": {
  "client_id": "123456789-abcdefg.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/drive.file"]
}
```

---

## Step 3 — Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this entire folder (`url-to-drive/`).
4. The extension will appear with an upload icon — note its **ID** shown under the name.

---

## Step 4 — Add the Extension ID to Google Cloud

1. Back in Google Cloud Console → **Credentials** → click your OAuth Client.
2. In the **Item ID** field, paste the Extension ID you noted in Step 3.
3. Click **Save**.

---

## How to Use

1. Click the extension icon in your Chrome toolbar.
2. Paste or type any URL you want to save.
3. Optionally give it a title.
4. Click **Save to Drive**.
5. Sign in with Google when prompted (first time only).
6. Click **Open in Drive →** to see the file.

When you open the file from Drive, it shows a page with the link and automatically
redirects to the original URL after 2 seconds.

---

## Notes

- Files are saved to the root of your Google Drive. You can move them to any folder after saving.
- The extension only requests `drive.file` scope — it can only see files it creates, not your entire Drive.
- To save to a specific folder, the folder ID can be added in `popup.js` under the `metadata` object (`parents: ['FOLDER_ID']`).
