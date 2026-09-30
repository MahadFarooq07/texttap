# TextTap

TextTap is a light, Apple-inspired Next.js site and a free Chrome extension for capturing text from webpages and images. The extension runs classic Tesseract OCR locally; it does not use a hosted AI service, account, or application backend.

## Website

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The landing page includes an interactive browser OCR demo, and `/download/` provides the extension ZIP and installation steps.

```sh
npm run typecheck
npm run build
```

The build verifies the published extension ZIP and then creates a static export in `out/`. Vercel is configured to install with `npm ci` and build the Next.js project from the repository root. Connect this repository in Vercel with the **Root Directory** set to `./` and the framework set to Next.js. Vercel manages its framework build output; `outputDirectory: null` explicitly restores its default instead of treating `out/` as Next.js build internals. The local static export remains in `out/`.

## Chrome extension

The current distributable is committed to `public/downloads/texttap-1.0.0.zip`, so it is served by Vercel alongside the site at `/downloads/texttap-1.0.0.zip`. `latest.json` includes the version, size, and SHA-256 digest, which the site build checks.

To rebuild the extension after changing its source, from the repository root run:

```sh
npm ci --prefix chrome-extension
npm run publish:extension
```

This builds and packages the offline extension, updates its versioned ZIP in `public/downloads/`, and refreshes the integrity metadata. Commit the updated ZIP and JSON together with the source change. The download page documents how to unzip it, open `chrome://extensions`, enable Developer mode, and load the extracted folder. This is a developer-mode download, not a Chrome Web Store listing or signed CRX.

Extension architecture, privacy details, license information, build steps, and test limitations are in [`chrome-extension/README.md`](chrome-extension/README.md), [`chrome-extension/ARCHITECTURE.md`](chrome-extension/ARCHITECTURE.md), and [`chrome-extension/PRIVACY.md`](chrome-extension/PRIVACY.md).

## Project layout

- `src/app/` — Next.js landing page, browser OCR demo, and extension download instructions.
- `public/downloads/` — versioned installable extension ZIP and integrity metadata.
- `chrome-extension/` — Manifest V3 extension source, local OCR engine build, documentation, and tests.
- `vercel.json` — root project build and static export settings for Vercel.
