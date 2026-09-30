import { richHtml, spreadsheetSafe } from "./format.js";

// Async Clipboard requires focus; Chrome offscreen documents cannot be focused.
// The extension's clipboardWrite permission allows a synchronous copy event.
export function copyFormatted(text, format = "paragraphs", doc = document) {
  const plain = format === "table" ? spreadsheetSafe(text) : text;
  const html = richHtml(plain, format);
  let written = false;
  const onCopy = (event) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", plain);
    event.clipboardData.setData("text/html", html);
    written = true;
  };
  const field = doc.createElement("textarea");
  field.value = plain;
  doc.body.append(field);
  field.select();
  doc.addEventListener("copy", onCopy);
  try {
    if (!doc.execCommand("copy") || !written)
      throw new Error(
        "Clipboard copy failed. Try capturing again, or use Open an image to copy in the editor.",
      );
  } finally {
    doc.removeEventListener("copy", onCopy);
    field.remove();
  }
}
