import { pixelCrop } from "./geometry.js";

export async function decodeImage(source) {
  let blob = source;
  if (typeof source === "string") {
    // Data URLs originate only from captureVisibleTab or our own sample.
    if (!source.startsWith("data:image/"))
      throw new Error("Only local images are supported.");
    const [header, body] = source.split(",");
    if (!header.endsWith(";base64") || !body)
      throw new Error("Invalid image data.");
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: header.slice(5, -7) });
  }
  if (!(blob instanceof Blob)) throw new Error("Choose an image file.");
  if (blob.size > 25 * 1024 * 1024)
    throw new Error("Choose an image smaller than 25 MB.");
  if (!/^image\/(png|jpeg|webp|bmp)$/.test(blob.type))
    throw new Error("Choose a PNG, JPEG, WebP, or BMP image.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error(
      "This image could not be decoded. Try saving it as a PNG or JPEG.",
    );
  }
  if (
    bitmap.width * bitmap.height > 40_000_000 ||
    bitmap.width > 16000 ||
    bitmap.height > 16000
  ) {
    bitmap.close();
    throw new Error(
      "This image is too large. Use an image under 40 megapixels and 16,000 pixels per side.",
    );
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}
export function cropCanvas(source, region) {
  const crop = pixelCrop(region, source.width, source.height);
  const result = document.createElement("canvas");
  result.width = crop.width;
  result.height = crop.height;
  result
    .getContext("2d")
    .drawImage(
      source,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
  return result;
}
export function prepareImage(source, { enhance = true, rotation = "0" } = {}) {
  const rotate = Number(rotation);
  const swap = rotate === 90 || rotate === 270;
  const naturalWidth = swap ? source.height : source.width,
    naturalHeight = swap ? source.width : source.height;
  const desiredScale =
    enhance && Math.max(naturalWidth, naturalHeight) < 2000 ? 2 : 1;
  const scale = Math.min(
    desiredScale,
    Math.sqrt(16_000_000 / (naturalWidth * naturalHeight)),
    6000 / Math.max(naturalWidth, naturalHeight),
  );
  const padding = 16;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * scale)) + padding * 2;
  canvas.height = Math.max(1, Math.round(naturalHeight * scale)) + padding * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
  if (enhance) {
    const image = ctx.getImageData(
        padding,
        padding,
        canvas.width - padding * 2,
        canvas.height - padding * 2,
      ),
      pixels = image.data;
    const histogram = new Uint32Array(256);
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = Math.round(
        0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2],
      );
      histogram[value]++;
      if (value < 110) dark++;
    }
    const count = pixels.length / 4,
      invert = dark / count > 0.6;
    let low = 0,
      high = 255,
      sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += histogram[i];
      if (sum > count * 0.01) {
        low = i;
        break;
      }
    }
    sum = 0;
    for (let i = 255; i >= 0; i--) {
      sum += histogram[i];
      if (sum > count * 0.01) {
        high = i;
        break;
      }
    }
    const range = high - low;
    for (let i = 0; i < pixels.length; i += 4) {
      let v = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (range > 35) v = Math.max(0, Math.min(255, ((v - low) * 255) / range));
      if (invert) v = 255 - v;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
      pixels[i + 3] = 255;
    }
    ctx.putImageData(image, padding, padding);
  }
  return canvas;
}
