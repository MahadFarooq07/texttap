# Verification

## Completed on this build

- v1.1.0: 39 automated tests passed, plus one real classic-OCR integration test (40 total).
- Capture routing verifies automatic copy without opening a tab, no screenshot persistence, source-tab race checks, overlapping-job rejection, hidden-document reuse and cleanup, saved formatting settings, sender validation, and heartbeat cleanup.
- Clipboard tests verify plain text and HTML paragraphs/lists, formula-safe table output, cleanup on clipboard failure, and an untouched clipboard for blank images, decoding errors, and OCR errors.
- Browser smoke test at `/capture-check.html` under the packaged CSP ran the actual offline OCR pipeline against the bundled sample. Recognition found 40 words and the real synchronous copy event contained the expected text/plain and text/html payloads, including paragraphs and numbered lists. No errors or warnings were logged for that smoke test.
- Website browser checks covered desktop and mobile layout, mobile navigation, download/version/GitHub links, automatic sample copying, and the real website image-recognition dialog.
- Website TypeScript and the production static-export build passed. HTTP checks verified both site routes, all 10 referenced page assets, and the v1.1.0 ZIP response against its size and SHA-256 metadata.
- Packaged as `release/texttap-1.1.0.zip`, also published to the site's `public/downloads/`, with the top-level manifest and offline engine assets. SHA-256 and size verification passes.
- **Not verified here:** installation into Chrome, actual screenshot capture and offscreen clipboard execution inside an installed extension, selection on third-party sites, and extension keyboard shortcuts. The available browser preview cannot load unpacked extensions. Its virtual clipboard is separate from the native copy event, so Ctrl+V into an external editor was not verified. Chrome API unit tests and the localhost smoke test do not substitute for these installation checks.

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
6. Capture the visible tab on a built-in PDF viewer. Verify text is copied automatically and no new tab opens. Protected content may not be capturable.
7. Disconnect networking before the first OCR run. Import a PNG and verify recognition still succeeds.
8. Cancel while the engine loads, then immediately run again. Ensure only the newest result updates the editor.
9. Try blank images, dark-background images, rotated text, small text, multi-column pages, and a table with missing cells. Review low-confidence results.
10. Edit text, switch formats, choose Keep edits, then choose Replace. Verify both paths.
11. Copy plain/rich text to a document; export TXT/Markdown/TSV. Check TSV cells starting with formula operators are escaped.
12. Close the popup during a capture; hidden recognition continues, the source input regains focus, and Ctrl+V (⌘V on Mac) pastes the recognized text. Verify paragraphs/lists in a rich editor and plain text in a plain field. Confirm the hidden document closes after success, empty results, and failures. Ensure no permanent result history appears.
13. Test shortcuts at chrome://extensions/shortcuts. Handle conflicts explicitly.

Keep these installation checks distinct from unit tests and the browser OCR preview; do not claim they passed until run on the installed extension.
