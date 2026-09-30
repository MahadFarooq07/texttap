import { decodeImage, cropCanvas, prepareImage } from "./image.js";
import { formatText, summarize } from "./format.js";
import { copyFormatted } from "./clipboard.js";
import { OcrEngine } from "./ocr.js";

export async function recognizeAndCopy(message, dependencies = {}) {
  const decode = dependencies.decode || decodeImage;
  const crop = dependencies.crop || cropCanvas;
  const prepare = dependencies.prepare || prepareImage;
  const engine = dependencies.engine || new OcrEngine();
  const copy = dependencies.copy || copyFormatted;
  const settings = message.settings || {
    format: "paragraphs",
    segmentation: "auto",
  };
  const image = await decode(message.image);
  const selected = message.region ? crop(image, message.region) : image;
  const data = await engine.recognize(prepare(selected, settings), settings);
  const text = formatText(data, settings.format);
  if (!text.trim())
    throw new Error(
      "No text found. Select a clearer or larger area. Your clipboard was left unchanged.",
    );
  await copy(text, settings.format);
  return { ok: true, words: summarize(data).words };
}
