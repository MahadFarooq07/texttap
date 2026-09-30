# TextTap Chrome extension

An independent Chrome Manifest V3 extension for capturing printed English text from the visible browser tab or a local image. It uses **classic Tesseract OCR (OEM 0)**, not an LLM, hosted AI service, or neural OCR inference. The website in the parent directory is separate.

## Install the already-built extension

1. Open `chrome://extensions` in Chrome 116 or newer.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder's **`dist`** directory.
4. Pin TextTap from Chrome's Extensions menu.
5. Click TextTap and choose **Select an area**, **Capture visible tab**, or **Open an image**.

The package is also available in `release/texttap-1.0.0.zip`. Extract it first, then load the extracted folder containing `manifest.json`. This is an unsigned development build, not a Chrome Web Store listing or a signed CRX.

Default area-capture shortcut: **Alt+Shift+S** (Option+Shift+S on Mac). Chrome may leave a shortcut unassigned if another extension uses it. Change it at `chrome://extensions/shortcuts`.

## Included functionality

- Area selection on ordinary HTTP(S) pages, including text rendered in images, canvases, and visible video frames. Escape cancels selection.
- Visible-tab capture followed by optional cropping in the editor. Useful for Chrome pages or PDF viewers that disallow injected selection UI.
- PNG, JPEG, WebP, and BMP import, drag and drop, and image paste. File limit: 25 MB; decoded limit: 40 megapixels / 16,000 px per side.
- Crop by dragging or entering pixel coordinates; reset crop; manual quarter-turn rotation.
- Local enhancement: small-image upscaling, grayscale/contrast stretch, dark-background inversion, white border, and bounded processing dimensions.
- Layout selection: automatic, single block, scattered text, single line.
- Progress, cancellation, 120-second OCR timeout, empty/low-confidence states, and worker cleanup.
- Editable output and five deterministic formatting modes: paragraphs, original lines, Markdown, table/TSV, and raw OCR.
- Plain-text and HTML clipboard copy; TXT, Markdown, and TSV downloads. No `downloads` or `clipboardRead` permission needed.
- Confirmation before a format switch, rerun, image replacement, or crop discards edited output.
- Locally saved settings. No capture history, telemetry, accounts, or application backend.

## Why this engine

Tesseract is free and Apache-2.0 licensed. Modern Tesseract normally uses an LSTM neural recognizer; this extension deliberately selects **`OEM.TESSERACT_ONLY`**, the classic recognizer, to meet a literal non-neural requirement. It never silently falls back to a neural engine.

There is a real accuracy tradeoff: classic OCR is useful for clear, straight, printed text but is generally less robust than modern neural OCR for difficult scans. There is no honest universal “perfect OCR” guarantee. Use clear screenshots, crop closely, and review low-confidence words. Handwriting, curved text, complex merged tables, exact fonts, and original bold/italic styling are not reliably reconstructed.

The official English data file includes both classic and LSTM components; only classic recognition is invoked. Its source, size, and SHA-256 are pinned in `assets.lock.json`. The build checks the hash before packaging it.

References:

- [Tesseract engine/data compatibility](https://tesseract-ocr.github.io/tessdoc/Data-Files.html)
- [Official legacy-capable language data](https://github.com/tesseract-ocr/tessdata/tree/4.1.0)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Chrome activeTab and capture APIs](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)

## Build and verify

Node.js 22 recommended. Run these commands **inside `chrome-extension`**, not the parent website:

```sh
npm ci
npm run build
npm test
npm run test:ocr
npm run package
```

The first build downloads the pinned language file from the official Tesseract repository into `.cache/`. Later builds use that cache. The **installed extension requires no internet access**, including its first OCR run. Worker JavaScript, all legacy CPU variants, WebAssembly, and gzipped English data are inside `dist/vendor`.

For a normal-browser editor preview:

```sh
npm run preview
```

Open `http://127.0.0.1:4174/editor.html`. The preview exercises image import, local OCR, editing, formatting, and export under the same CSP. Screenshot capture, shortcut invocation, popup messaging, and Chrome extension permissions require the installed extension; a website preview does not validate those Chrome APIs.

## Structure

```text
manifest.json            Minimal MV3 permissions and strict CSP
src/background.js        Capture routing and active-tab checks
src/selection.js         On-demand isolated selection overlay
src/editor.js            OCR workspace and state transitions
src/popup.js             Toolbar actions
src/lib/ocr.js           Classic local OCR worker lifecycle
src/lib/image.js         Decode, crop, rotate, and enhance
src/lib/format.js        Rule-based paragraphs, Markdown, TSV, safe HTML
src/lib/geometry.js      Viewport-to-screenshot crop conversion
src/lib/storage.js       One-use capture transfer and preferences
public/                 Light-theme HTML/CSS and startup diagnostics
scripts/                Build, integrity checks, preview, ZIP packaging
tests/                  Formatting, geometry, build, real OCR regression
dist/                   Load this directory in Chrome
release/                Distributable development ZIP
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [PRIVACY.md](PRIVACY.md), and [TESTING.md](TESTING.md) for implementation details and verification boundaries.
