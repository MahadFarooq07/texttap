export function normalizeRect(start, end, width, height) {
  const clamp = (value, max) => Math.max(0, Math.min(max, value));
  const x0 = clamp(Math.min(start.x, end.x), width);
  const y0 = clamp(Math.min(start.y, end.y), height);
  const x1 = clamp(Math.max(start.x, end.x), width);
  const y1 = clamp(Math.max(start.y, end.y), height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function validateRegion(region) {
  if (
    !region ||
    !["x", "y", "width", "height", "viewportWidth", "viewportHeight"].every(
      (key) => Number.isFinite(region[key]),
    )
  )
    return false;
  return (
    region.x >= 0 &&
    region.y >= 0 &&
    region.width >= 5 &&
    region.height >= 5 &&
    region.viewportWidth > 0 &&
    region.viewportHeight > 0 &&
    region.x + region.width <= region.viewportWidth + 1 &&
    region.y + region.height <= region.viewportHeight + 1
  );
}

// Derive each scale from the actual screenshot. DevicePixelRatio alone fails at
// fractional display scaling, zoom, and browser screenshot rounding boundaries.
export function pixelCrop(region, imageWidth, imageHeight) {
  if (!validateRegion(region))
    throw new Error("The selected region is invalid. Please select it again.");
  if (!(imageWidth > 0 && imageHeight > 0))
    throw new Error("Invalid screenshot dimensions.");
  const sx = imageWidth / region.viewportWidth;
  const sy = imageHeight / region.viewportHeight;
  const left = Math.max(0, Math.floor(region.x * sx));
  const top = Math.max(0, Math.floor(region.y * sy));
  const right = Math.min(imageWidth, Math.ceil((region.x + region.width) * sx));
  const bottom = Math.min(
    imageHeight,
    Math.ceil((region.y + region.height) * sy),
  );
  return { left, top, width: right - left, height: bottom - top };
}
