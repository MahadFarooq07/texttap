# Verification

## Completed on this build

- 24 automated tests passed, plus the real classic-OCR integration test (25 total).
- Browser editor preview under the packaged CSP: recognized the bundled image, extracted the expected sentences, copied plain and rich text, generated a Markdown heading, retained edits on Keep edits, regenerated text on Replace, applied a 1,200 × 130 pixel crop, cancelled recognition, successfully restarted, and reset the crop.
- No browser console errors were reported during the successful OCR run.
- Packaged as `release/texttap-1.0.0.zip` with a top-level manifest and bundled offline assets.
- **Not verified here:** installation into Chrome, actual Chrome screenshot capture, injected selection on third-party sites, and extension keyboard shortcuts. The available browser preview does not load unpacked extensions. Tests for capture routing use mocked Chrome APIs and do not substitute for these installation checks.

## Automated

`npm test` checks reverse selection, fractional display scaling, crop bounds, malformed requests, paragraph/list handling, multi-column ordering, table alignment/missing cells, HTML injection prevention, formula-safe spreadsheet export, confidence reporting, exact packaged data integrity, runtime asset completeness, and minimal manifest permissions.

`npm run test:ocr` runs the actual Tesseract classic engine against the generated sample PNG with local language data. It checks expected phrases, layout output, and a minimum confidence threshold. This test is deliberately non-networked; the language path is a local directory. The initial fixture scored 91% OCR confidence. That is not a measured accuracy percentage and is not a benchmark across arbitrary documents.

## Chrome installation acceptance checklist

These checks require a real Chrome installation with the unpacked extension loaded. A localhost editor preview cannot certify extension permissions or Chrome capture APIs.

1. Load `dist` at chrome://extensions. Verify no manifest/CSP/service-worker errors.
2. Open an ordinary web page, invoke Select an area, drag in every direction, and verify the image crop matches the selection.
3. Repeat at 80%, 125%, and 200% browser zoom and on high-DPI displays.
4. Press Escape and resize/scroll during selection; ensure the overlay is removed.
5. Switch tabs during capture; ensure it fails instead of processing another tab.
6. Capture the visible tab on a built-in PDF viewer and use editor crop when injection is blocked. Protected content may not be capturable.
7. Disconnect networking before the first OCR run. Import a PNG and verify recognition still succeeds.
8. Cancel while the engine loads, then immediately run again. Ensure only the newest result updates the editor.
9. Try blank images, dark-background images, rotated text, small text, multi-column pages, and a table with missing cells. Review low-confidence results.
10. Edit text, switch formats, choose Keep edits, then choose Replace. Verify both paths.
11. Copy plain/rich text to a document; export TXT/Markdown/TSV. Check TSV cells starting with formula operators are escaped.
12. Close the popup while OCR runs in the editor; recognition continues. Close/reload the editor; no permanent result history should appear.
13. Test shortcuts at chrome://extensions/shortcuts. Handle conflicts explicitly.

Keep these installation checks distinct from unit tests and the browser OCR preview; do not claim they passed until run on the installed extension.
