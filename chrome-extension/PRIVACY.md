# Privacy

TextTap processes screenshots and image files on your device. It does not send images, extracted text, settings, browsing history, URLs, or diagnostics to a server. It has no accounts, analytics, advertising, tracking, or cloud OCR service.

The installed extension includes its OCR worker, WebAssembly engine, and English data. It does not download these when you use it. Its network policy allows only its own packaged resources.

The extension requests:

- **activeTab:** temporary access to the tab you explicitly invoke it on, so it can take the visible screenshot.
- **scripting:** show the region selector on that tab when requested.
- **storage:** remember layout/format/enhancement preferences on this device.
- **clipboardWrite:** automatically copy text after an explicit area or visible-tab capture, and copy edited results when you click a copy button. Plain text and safe formatted HTML are written. It does not read your clipboard in the background. Pasted images are received only through an explicit paste event in the editor.
- **offscreen:** run the packaged OCR worker and write to the clipboard in a hidden extension document, keeping you on your source tab.

Area and visible-tab captures remain in memory while the hidden document recognizes and copies them. The document and OCR worker close after each job, including failures. Screenshots and results are not saved as history. Session storage keeps only success/error status, without recognized text or source URLs. Legacy pending captures from older releases expire after 30 minutes and are pruned on startup or installation. Imported images and editable results remain in editor memory until it closes.

Chrome or your operating system manages clipboard contents and downloads after you export. Removing the extension removes its extension-managed preferences and local storage. The project does not provide encrypted capture storage or secure deletion guarantees.
