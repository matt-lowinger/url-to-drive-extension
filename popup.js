/**
 * URL to Google Drive — popup.js
 * Saves any URL to Google Drive as a Google Doc with a clickable link.
 */

const DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const urlInput      = document.getElementById('urlInput');
const titleInput    = document.getElementById('titleInput');
const saveBtn       = document.getElementById('saveBtn');
const currentTabBtn = document.getElementById('currentTabBtn');
const statusEl      = document.getElementById('status');
const statusIcon    = document.getElementById('statusIcon');
const statusText    = document.getElementById('statusText');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(type, message, linkInfo) {
  statusEl.className = 'status ' + type;
  statusText.textContent = message;

  if (type === 'loading') {
    statusIcon.innerHTML = '<div class="spinner"></div>';
  } else if (type === 'success') {
    statusIcon.textContent = '✓';
    if (linkInfo) {
      // Replace text with a clickable link after a beat
      statusText.innerHTML = `Saved! <button class="drive-link" id="openLink">Open in Drive →</button>`;
      document.getElementById('openLink').addEventListener('click', () => {
        chrome.tabs.create({ url: linkInfo.webViewLink });
      });
    }
  } else if (type === 'error') {
    statusIcon.textContent = '✕';
  }
}

function clearStatus() {
  statusEl.className = 'status';
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Build simple HTML that Google Drive converts into a clean Google Doc ─────

function buildLinkHtml(url, title) {
  const safeUrl   = escapeHtml(url);
  const safeTitle = escapeHtml(title);
  const savedDate = new Date().toLocaleString();

  // Minimal HTML — Drive converts this to a Google Doc, preserving the
  // heading and the hyperlink so the user can click it directly.
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${safeTitle}</title></head>
<body>
  <h1>${safeTitle}</h1>
  <p><a href="${safeUrl}">${safeUrl}</a></p>
  <p style="color:#888;font-size:0.85em">Saved on ${savedDate}</p>
</body>
</html>`;
}

// ─── OAuth + Drive upload ─────────────────────────────────────────────────────

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

async function uploadToDrive(token, filename, htmlContent) {
  const boundary = '----URLtoDrive_' + Math.random().toString(36).slice(2);

  // Setting mimeType to google-apps.document tells Drive to CONVERT the
  // uploaded HTML into a real Google Doc, rather than store it as a raw file.
  // This means it opens and renders correctly — with a clickable link.
  const metadata = JSON.stringify({
    name: filename,
    mimeType: 'application/vnd.google-apps.document'
  });

  // Build multipart body as a string
  const parts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    `${metadata}\r\n`,
    `--${boundary}\r\n`,
    `Content-Type: text/html; charset=UTF-8\r\n\r\n`,
    `${htmlContent}\r\n`,
    `--${boundary}--`
  ].join('');

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: parts
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  return response.json(); // { id, name, webViewLink }
}

// ─── "Current Tab" button ─────────────────────────────────────────────────────

currentTabBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url) {
      urlInput.value = tab.url;
      if (!titleInput.value && tab.title) {
        titleInput.value = tab.title;
      }
    }
  });
});

// ─── Save button ──────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  clearStatus();

  const url = urlInput.value.trim();
  if (!url) {
    setStatus('error', 'Please enter a URL.');
    return;
  }
  if (!isValidUrl(url)) {
    setStatus('error', 'Please enter a valid http(s) URL.');
    return;
  }

  const rawTitle = titleInput.value.trim() || url;
  // Google Docs don't use file extensions — just a clean title
  const docTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '_').substring(0, 200);

  saveBtn.disabled = true;
  setStatus('loading', 'Connecting to Google…');

  try {
    const token = await getAuthToken();

    setStatus('loading', 'Uploading to Drive…');

    const htmlContent = buildLinkHtml(url, rawTitle);
    const result = await uploadToDrive(token, docTitle, htmlContent);

    setStatus('success', '', result);
  } catch (err) {
    console.error('URL to Drive error:', err);
    setStatus('error', err.message || 'Something went wrong.');
  } finally {
    saveBtn.disabled = false;
  }
});
