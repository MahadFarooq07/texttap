# Third-party notices

- **Tesseract.js 7.0.0** — Apache-2.0. https://github.com/naptha/tesseract.js
- **Tesseract.js-core** (version pinned by package-lock.json) — Apache-2.0 distribution of the Tesseract / Leptonica WebAssembly engine. https://github.com/naptha/tesseract.js-core
- **Tesseract English recognition data, tessdata 4.1.0** — Apache-2.0. The exact source, size, and SHA-256 are recorded in assets.lock.json. https://github.com/tesseract-ocr/tessdata/tree/4.1.0
- Tesseract.js's bundled supporting dependencies retain their license comments in the emitted JavaScript and .LEGAL.txt files. Its worker bundle is copied verbatim from the official npm package.
- esbuild, sharp, and fflate are build/test/package tools; they do not execute in the installed extension.

The official English data includes both legacy and LSTM data components. TextTap always selects OEM 0, so it does not perform neural inference. No external API or hosted model is called. Bundling data is not a claim that classic OCR matches modern neural recognition accuracy.

License texts shipped with these packages are copied into dist/licenses during the build. Before Chrome Web Store publication, review the complete dependency and bundled-engine notices for your distribution obligations.
