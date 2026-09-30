import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRect,
  pixelCrop,
  validateRegion,
} from "../src/lib/geometry.js";

test("reverse drags are normalized and clamped", () => {
  assert.deepEqual(
    normalizeRect({ x: 90, y: 80 }, { x: -10, y: 20 }, 100, 100),
    { x: 0, y: 20, width: 90, height: 60 },
  );
});
test("crop uses actual screenshot ratios at fractional zoom", () => {
  assert.deepEqual(
    pixelCrop(
      {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        viewportWidth: 800,
        viewportHeight: 600,
      },
      1200,
      900,
    ),
    { left: 15, top: 30, width: 150, height: 75 },
  );
});
test("crop rounds outwards without exceeding image boundaries", () => {
  const crop = pixelCrop(
    {
      x: 90.2,
      y: 70.1,
      width: 9.8,
      height: 9.9,
      viewportWidth: 100,
      viewportHeight: 80,
    },
    151,
    121,
  );
  assert.equal(crop.left + crop.width, 151);
  assert.equal(crop.top + crop.height, 121);
});
test("rejects malformed, tiny, and out-of-bounds regions", () => {
  for (const region of [
    null,
    {},
    { x: NaN },
    {
      x: 0,
      y: 0,
      width: 0,
      height: 20,
      viewportWidth: 100,
      viewportHeight: 100,
    },
    {
      x: -1,
      y: 0,
      width: 20,
      height: 20,
      viewportWidth: 100,
      viewportHeight: 100,
    },
    {
      x: 95,
      y: 0,
      width: 20,
      height: 20,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  ])
    assert.equal(validateRegion(region), false);
  assert.throws(() => pixelCrop(null, 100, 100));
});
