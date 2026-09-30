import { decodeImage, cropCanvas, prepareImage } from "./lib/image.js";
import {
  formatText,
  richHtml,
  spreadsheetSafe,
  summarize,
} from "./lib/format.js";
import {
  getSettings,
  saveSettings,
  takeCapture,
  pruneCaptures,
} from "./lib/storage.js";
import { normalizeRect } from "./lib/geometry.js";
import { OcrEngine } from "./lib/ocr.js";

const $ = (id) => document.getElementById(id);
let original = null,
  source = null,
  result = null,
  busy = false,
  edited = false,
  cropping = false,
  cropStart = null,
  sourceName = "image";
let outputFormat = "paragraphs",
  loadSequence = 0,
  recognitionSequence = 0;
const engine = new OcrEngine((message) => {
  const recognizing = message.status === "recognizing text";
  $("progress-label").textContent = recognizing
    ? "Reading your image…"
    : "Loading the bundled OCR engine…";
  const value = Math.round((message.progress || 0) * 100);
  $("progress-value").textContent = recognizing ? `${value}%` : "";
  $("progress").value = recognizing ? value : 0;
});
const hints = {
  paragraphs:
    "Keeps paragraph breaks and lists. Joins wrapped lines without rewriting words.",
  lines: "Preserves line breaks and OCR paragraph boundaries.",
  markdown:
    "Adds conservative heading and list markers. Review inferred headings before using them.",
  table:
    "Uses word positions to infer rows and columns. Review alignment. Spreadsheet formula-like cells are escaped on copy/export.",
  raw: "The original OCR output, with no reflow or layout reconstruction.",
};

function notice(message = "", tone = "error") {
  $("notice").textContent = message;
  $("notice").hidden = !message;
  $("notice").dataset.tone = tone;
}
function settings() {
  return {
    segmentation: $("segmentation").value,
    rotation: $("rotation").value,
    enhance: $("enhance").checked,
    format: outputFormat,
  };
}
function persistSettings() {
  void saveSettings(settings()).catch(() =>
    notice("Your preferences couldn’t be saved. OCR will still work.", "info"),
  );
}
function clearResult() {
  result = null;
  edited = false;
  $("output").value = "";
  $("output").disabled = true;
  $("confidence").hidden = true;
  $("result-meta").textContent = "Ready when you are";
  $("restore").disabled = true;
  updateOutput();
}
function updateOutput() {
  const text = $("output").value,
    hasText = !!text.trim();
  for (const id of ["copy", "copy-rich", "download"])
    $(id).disabled = !hasText || busy;
  $("word-count").textContent =
    `${text.trim() ? text.trim().split(/\s+/).length : 0} words · ${text.length} characters${edited ? " · edited" : ""}`;
  $("copy-status").textContent = "";
  $("copy").textContent = "Copy text";
  $("download").textContent =
    outputFormat === "markdown"
      ? "Save .md"
      : outputFormat === "table"
        ? "Save .tsv"
        : "Save .txt";
}
function setBusy(value) {
  busy = value;
  for (const id of [
    "new-image",
    "file-input",
    "segmentation",
    "rotation",
    "enhance",
    "sample",
    "crop-toggle",
    "format",
    "apply-crop",
  ])
    $(id).disabled = value;
  $("recognize").disabled = value || !source;
  $("reset-crop").disabled = value || source === original;
  $("recognize").textContent = value ? "Extracting…" : "Extract text ↵";
  $("cancel").hidden = !value;
  $("progress-area").hidden = !value;
  $("restore").disabled = value || !result;
  $("output").disabled = value || !result;
  $("dropzone").setAttribute("aria-disabled", String(value));
  updateOutput();
}
async function confirmReplace(
  message = "This will replace the changes you made to the result.",
) {
  if (!edited) return true;
  const dialog = $("confirm-dialog");
  if (dialog.open) return false;
  $("confirm-message").textContent = message;
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) =>
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "replace"),
      { once: true },
    ),
  );
}
function renderImage() {
  const preview = $("preview");
  preview.width = source.width;
  preview.height = source.height;
  preview.getContext("2d").drawImage(source, 0, 0);
  $("dropzone").hidden = true;
  $("image-stage").hidden = false;
  $("crop-controls").hidden = false;
  $("dimensions").textContent =
    `${source.width.toLocaleString()} × ${source.height.toLocaleString()} px`;
  $("image-name").textContent = sourceName;
  $("image-name").title = sourceName;
  $("recognize").disabled = false;
  $("reset-crop").disabled = source === original;
}
function setCropMode(value) {
  cropping = value;
  cropStart = null;
  $("crop-overlay").hidden = !value;
  $("crop-fields").hidden = !value;
  $("crop-toggle").textContent = value ? "Cancel crop" : "Crop image";
  $("crop-overlay").firstElementChild.style.display = "none";
  if (value) {
    $("crop-x").value = 0;
    $("crop-y").value = 0;
    $("crop-width").value = source.width;
    $("crop-height").value = source.height;
  }
}
async function loadImage(image, name, region = null, autoRun = false) {
  if (busy) return;
  const sequence = ++loadSequence;
  if (
    !(await confirmReplace(
      "Opening an image replaces your current result and edits.",
    ))
  )
    return;
  try {
    notice("Opening your image…", "info");
    const decoded = await decodeImage(image);
    if (sequence !== loadSequence) return;
    original = decoded;
    source = region ? cropCanvas(decoded, region) : decoded;
    sourceName = name;
    clearResult();
    setCropMode(false);
    renderImage();
    notice();
    if (autoRun) await recognize();
  } catch (error) {
    notice(error.message);
  }
}
async function recognize() {
  if (busy || !source) return;
  if (
    !(await confirmReplace(
      "Running OCR again will replace the current text and your edits.",
    ))
  )
    return;
  const sequence = ++recognitionSequence;
  notice();
  setCropMode(false);
  setBusy(true);
  $("progress").value = 0;
  $("progress-value").textContent = "";
  $("progress-label").textContent = "Preparing your image…";
  try {
    // Give progress UI a paint before canvas preprocessing begins.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    if (!busy || sequence !== recognitionSequence) return;
    const prepared = prepareImage(source, settings());
    const data = await engine.recognize(prepared, settings());
    if (sequence !== recognitionSequence) return;
    result = data;
    edited = false;
    $("output").value = formatText(data, outputFormat);
    const info = summarize(data);
    $("result-meta").textContent = `${info.confidence}% OCR confidence`;
    $("confidence").hidden = !info.uncertain.length;
    $("confidence").textContent =
      `Worth a second look: ${info.uncertain.join(", ")}. Confidence is the OCR engine’s estimate, not a guarantee of correctness.`;
    if (!data.text?.trim())
      notice(
        "No readable text found. Crop closer, choose Single text block, rotate the image, or try without enhancement.",
        "info",
      );
    else if (info.confidence < 65)
      notice(
        "This capture has low confidence. Review the result, or crop closer and try a different layout setting.",
        "info",
      );
  } catch (error) {
    if (sequence === recognitionSequence)
      notice(
        error.message,
        error.message.includes("cancelled") ? "info" : "error",
      );
  } finally {
    if (sequence === recognitionSequence) setBusy(false);
  }
}

$("new-image").addEventListener("click", () => $("file-input").click());
$("dropzone").addEventListener("click", () => {
  if (!busy) $("file-input").click();
});
$("dropzone").addEventListener("keydown", (event) => {
  if (["Enter", " "].includes(event.key) && !busy) {
    event.preventDefault();
    $("file-input").click();
  }
});
$("file-input").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) void loadImage(file, file.name);
  event.target.value = "";
});
document.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (!busy) $("dropzone").classList.add("dragging");
});
document.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) $("dropzone").classList.remove("dragging");
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  $("dropzone").classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file && !busy) void loadImage(file, file.name);
});
document.addEventListener("paste", (event) => {
  if (
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLInputElement ||
    busy
  )
    return;
  const file = Array.from(event.clipboardData.items)
    .find((item) => item.kind === "file" && item.type.startsWith("image/"))
    ?.getAsFile();
  if (file) {
    event.preventDefault();
    void loadImage(file, "Pasted image");
  }
});
$("recognize").addEventListener("click", recognize);
$("cancel").addEventListener("click", () => {
  recognitionSequence++;
  engine.cancel();
  setBusy(false);
  notice("Recognition cancelled.", "info");
});
window.addEventListener("pagehide", () => engine.cancel());
$("output").addEventListener("input", () => {
  edited = true;
  updateOutput();
});
$("format").addEventListener("change", async () => {
  const next = $("format").value;
  if (
    !(await confirmReplace(
      "Switching formats will regenerate the result from the original OCR and replace your edits.",
    ))
  ) {
    $("format").value = outputFormat;
    return;
  }
  outputFormat = next;
  edited = false;
  $("format-hint").textContent = hints[next];
  if (result) $("output").value = formatText(result, next);
  updateOutput();
  persistSettings();
});
$("restore").addEventListener("click", async () => {
  if (result && (await confirmReplace())) {
    edited = false;
    $("output").value = formatText(result, outputFormat);
    updateOutput();
  }
});
for (const id of ["segmentation", "rotation", "enhance"])
  $(id).addEventListener("change", persistSettings);
$("copy").addEventListener("click", async () => {
  try {
    const text =
      outputFormat === "table"
        ? spreadsheetSafe($("output").value)
        : $("output").value;
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "Copied ✓";
    $("copy-status").textContent = "Copied to your clipboard.";
  } catch {
    $("copy-status").textContent =
      "Clipboard access was blocked. Select the text and use Ctrl/Cmd+C.";
    $("output").focus();
    $("output").select();
  }
});
$("copy-rich").addEventListener("click", async () => {
  try {
    const text =
      outputFormat === "table"
        ? spreadsheetSafe($("output").value)
        : $("output").value;
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([richHtml(text, outputFormat)], {
          type: "text/html",
        }),
      }),
    ]);
    $("copy-status").textContent =
      "Copied with formatting. Paste into a document or rich-text editor.";
  } catch {
    $("copy-status").textContent =
      "Rich copying is unavailable here. Use Copy text instead.";
  }
});
$("download").addEventListener("click", () => {
  const extension =
    outputFormat === "markdown"
      ? "md"
      : outputFormat === "table"
        ? "tsv"
        : "txt";
  const text =
    outputFormat === "table"
      ? spreadsheetSafe($("output").value)
      : $("output").value;
  const url = URL.createObjectURL(
    new Blob([text], {
      type:
        extension === "tsv"
          ? "text/tab-separated-values;charset=utf-8"
          : "text/plain;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `texttap-${new Date().toISOString().slice(0, 10)}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("crop-toggle").addEventListener("click", () => {
  if (source && !busy) setCropMode(!cropping);
});
$("reset-crop").addEventListener("click", async () => {
  if (
    original &&
    !busy &&
    (await confirmReplace("Resetting the crop clears the current result."))
  ) {
    source = original;
    clearResult();
    setCropMode(false);
    renderImage();
  }
});
function cropPoint(event) {
  const rect = $("crop-overlay").getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        source.width,
        ((event.clientX - rect.left) * source.width) / rect.width,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        source.height,
        ((event.clientY - rect.top) * source.height) / rect.height,
      ),
    ),
  };
}
$("crop-overlay").addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  cropStart = cropPoint(event);
  event.currentTarget.setPointerCapture(event.pointerId);
});
$("crop-overlay").addEventListener("pointermove", (event) => {
  if (!cropStart) return;
  const rect = normalizeRect(
    cropStart,
    cropPoint(event),
    source.width,
    source.height,
  );
  for (const key of ["x", "y", "width", "height"])
    $("crop-" + key).value = Math.round(rect[key]);
  const overlay = $("crop-overlay").firstElementChild;
  overlay.style.cssText = `display:block;left:${(rect.x / source.width) * 100}%;top:${(rect.y / source.height) * 100}%;width:${(rect.width / source.width) * 100}%;height:${(rect.height / source.height) * 100}%`;
});
$("crop-overlay").addEventListener("pointerup", () => {
  cropStart = null;
});
$("crop-overlay").addEventListener("pointercancel", () => {
  cropStart = null;
});
$("apply-crop").addEventListener("click", async () => {
  if (
    !source ||
    busy ||
    !(await confirmReplace("Applying a new crop clears the current result."))
  )
    return;
  try {
    const rect = { viewportWidth: source.width, viewportHeight: source.height };
    for (const key of ["x", "y", "width", "height"])
      rect[key] = Number($("crop-" + key).value);
    source = cropCanvas(source, rect);
    clearResult();
    setCropMode(false);
    renderImage();
    notice();
  } catch (error) {
    notice(error.message);
  }
});
$("sample").addEventListener("click", async () => {
  if (busy) return;
  try {
    notice("Opening the bundled sample…", "info");
    const response = await fetch(new URL("sample.png", location.href));
    if (!response.ok)
      throw new Error("The bundled sample is missing. Rebuild the extension.");
    await loadImage(await response.blob(), "TextTap sample", null, true);
  } catch (error) {
    notice(error.message);
  }
});
document.addEventListener("keydown", (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key === "Enter" &&
    !$("confirm-dialog").open
  ) {
    event.preventDefault();
    void recognize();
  }
});

async function initialize() {
  const saved = await getSettings();
  $("segmentation").value = saved.segmentation;
  $("rotation").value = saved.rotation;
  $("enhance").checked = saved.enhance;
  outputFormat = saved.format;
  $("format").value = outputFormat;
  $("format-hint").textContent = hints[outputFormat];
  const params = new URLSearchParams(location.search),
    id = params.get("capture");
  if (params.has("error")) notice(params.get("error"));
  if (id) {
    const capture = await takeCapture(id);
    history.replaceState(null, "", location.pathname);
    if (!capture)
      notice(
        "This capture has expired or was already opened. Capture the source again, or choose an image.",
      );
    else await loadImage(capture.image, "Screen capture", capture.region, true);
  }
  void pruneCaptures();
}
initialize().catch((error) =>
  notice(`Could not open your capture: ${error.message}`),
);
