# Privacy

TextTap processes screenshots and image files on your device. It does not send images, extracted text, settings, browsing history, URLs, or diagnostics to a server. It has no accounts, analytics, advertising, tracking, or cloud OCR service.

The installed extension includes its OCR worker, WebAssembly engine, and English data. It does not download these when you use it. Its network policy allows only its own packaged resources.

The extension requests:

- **activeTab:** temporary access to the tab you explicitly invoke it on, so it can take the visible screenshot.
- **scripting:** show the region selector on that tab when requested.
- **storage:** remember layout/format/enhancement preferences on this device.
- **clipboardWrite:** copy the result when you click a copy button. It does not read your clipboard in the background. Pasted images are received only through an explicit paste event in the editor.

Pending screenshots are temporarily stored in local IndexedDB to transfer them from the capture worker to the editor. They are deleted when the editor consumes them. Unconsumed captures expire after 30 minutes and are removed during subsequent cleanup operations; they may remain physically on disk until cleanup runs. Extracted results remain only in editor memory unless you explicitly copy or download them.

Chrome or your operating system manages clipboard contents and downloads after you export. Removing the extension removes its extension-managed preferences and local storage. The project does not provide encrypted capture storage or secure deletion guarantees.
