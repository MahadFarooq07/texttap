# Technical architecture

## Capture flow

The toolbar popup sends a small typed message to the MV3 service worker. The service worker checks the sender's extension identity and route, then uses the temporary `activeTab` grant. It injects a selection script only after the user chooses an area capture. There are no always-on content scripts or broad host permissions.

Selection is rendered in an isolated-world closed shadow root. Coordinates remain in viewport CSS pixels. The script hides its overlay and waits two animation frames before requesting capture. Scrolling/resizing cancels selection. The service worker verifies the selected tab is still active before and after `captureVisibleTab`, avoiding use of a different tab's image after a tab switch.

The screenshot's actual width/height relative to viewport dimensions determines crop scaling. This avoids relying on a potentially incorrect devicePixelRatio at fractional zoom/display scaling.

## Transfer and lifetime

The worker sends the screenshot, crop rectangle, and validated saved settings to a packaged offscreen document. They remain in memory and are not written to IndexedDB. Recognition and clipboard writing complete before the worker replies to the popup or selector. A single-job guard prevents overlapping captures from racing to overwrite the clipboard or close another job's document. Session storage contains only the last job's status, not recognized text or source URLs.

The offscreen document is closed in a finally block after success or failure, releasing its image and OCR memory. Legacy IndexedDB transfers from older releases are still pruned on startup/install. Imported images remain in the optional editor's memory and disappear when it closes. There is no cloud persistence or capture history.

## Hidden recognition and direct copying

The offscreen API provides DOM, canvas, workers, and clipboard access without opening or focusing a tab. The document sends a heartbeat every 20 seconds to keep the service worker alive during the 120-second recognition budget. It accepts jobs only from the extension's service worker. The document cannot be focused, so copying uses a synchronous copy event and the clipboardWrite permission instead of the focus-dependent Async Clipboard API. The copy handler writes text/plain and text/html, escapes OCR markup, and neutralizes formula-like table cells in both representations. Clipboard failures are returned explicitly. Empty/failed OCR never invokes copy.

The selector is removed before capture and restores the previously focused input. It displays a temporary success/error toast after the job completes. A toolbar badge and popup status expose reading, success, and failure states. Only an explicit Image editor & formatting action opens an editor tab; that editor retains image import, manual review, and formatting preferences.

## Recognition pipeline

1. Validate image type/size and decode with createImageBitmap.
2. Apply the screenshot crop or optional editor crop.
3. Apply the selected manual rotation.
4. Optionally upscale small images and normalize contrast, grayscale, and dark backgrounds. Cap the preprocessing surface at approximately 16 megapixels plus padding / 6,000 px per side.
5. Instantiate a packaged Tesseract.js worker with OEM 0, legacyCore=true, legacyLang=true, workerBlobURL=false, and explicitly local core/lang/worker paths.
6. Set segmentation mode and preserve_interword_spaces. Recognize text plus blocks and TSV.
7. Retain the original OCR result only in editor memory; derive each display format from it.
8. Terminate the worker after every job, cancellation, or timeout. The tradeoff is startup cost per capture in exchange for releasing WASM memory predictably.

There is no automatic LSTM fallback, generative correction, external download at runtime, or network service. The worker wrapper uses an epoch to discard late initialization after cancellation. The editor separately guards stale jobs so an old cancellation cannot overwrite the next result.

## Formatting

- **Paragraphs:** keep OCR block/paragraph order; join lines inside each paragraph; retain explicit list items. Hard hyphens are preserved rather than guessing whether a word should be dehyphenated.
- **Lines:** preserve OCR line and paragraph boundaries.
- **Markdown:** conservatively identify larger single-line headings from word heights and normalize bullet characters. It is a heuristic, not exact document reconstruction.
- **Table/TSV:** group words into geometric rows, split wide horizontal gaps into cells, cluster column starts, and retain missing cells. Complex tables require manual review.
- **Raw:** retain un-reflowed OCR text.

All rich HTML is generated from escaped text. OCR-provided HTML is never inserted. Spreadsheet-like formula prefixes are escaped only when exporting/copying TSV, leaving the displayed recognition result available for review. Edited output is not silently discarded on format changes or reruns.

## Security boundaries

- Permissions: activeTab, scripting, storage, clipboardWrite, offscreen.
- No host_permissions, remotely hosted code, public web-accessible resources, analytics, fetch-to-image-URL feature, or external message listener.
- Extension CSP denies external connections and permits WASM compilation without JavaScript unsafe-eval.
- Only user-selected local images and visible screenshots are processed. Source page URLs/titles are not saved with captures.
- `chrome://`, Chrome Web Store, and some PDF pages disallow injection. The UI directs the user to visible-tab capture instead. Capture availability remains subject to Chrome policies and protected-content restrictions.

English is the only packaged language. Add another language only by validating legacy compatibility, recording its source/hash/license, bundling it, and exposing an explicit language choice. Many scripts have no legacy data; do not replace them with neural data while claiming non-neural operation.
