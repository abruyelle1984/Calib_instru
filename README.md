# TS Check – Total station field check (PWA)

Installable web app for total station field checks: two-face collimation and vertical index,
tilting axis, compensator, ATR, EDM baseline, laser plummet, printable report.
Works offline once installed. Data is stored on each phone (IndexedDB).

## Files
- `index.html` – the app
- `manifest.webmanifest`, `sw.js` – install + offline support
- `icons/`, `fonts/` – bundled so the app works with no network

## Hosting (HTTPS is required for install/offline)

### Option A – GitHub Pages (free, ~5 min)
1. Create a GitHub repository (e.g. `ts-check`), public or private with Pages enabled.
2. Upload the whole folder content (keep `icons/` and `fonts/` folders).
3. Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)` → Save.
4. After ~1 min the app is at `https://<user>.github.io/ts-check/`.

### Option B – Company web server / intranet
Copy the folder to any HTTPS web server. Serve `.webmanifest` as `application/manifest+json`.
Note: an intranet-only URL works on phones only while they can reach the intranet for the first install.

## Installing on a phone
- **iPhone (Safari):** open the URL → Share button → "Add to Home Screen".
- **Android (Chrome):** open the URL → menu ⋮ → "Install app" (or "Add to Home screen").
Open it once while online; after that it works offline.

## Data
- Each phone keeps its own log. Use **Back up (JSON)** regularly and **Restore backup** to move
  checks to another phone (restore merges; newer versions win).
- **Export log (CSV)** gives an Excel-ready register of all checks.
- iOS may clear data of apps not opened for several weeks if not installed on the Home Screen:
  install it, and keep JSON backups.

## Updating the app
Replace the files on the server and change `VERSION` in `sw.js` (e.g. `ts-check-v2`).
Phones update automatically the next time the app is opened online.
