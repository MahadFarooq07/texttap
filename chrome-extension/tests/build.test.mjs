import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "dist/manifest.json"), "utf8"),
);
test("MV3 permissions are narrowly scoped to explicit captures", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.description.length <= 132);
  assert.deepEqual(
    manifest.permissions.sort(),
    ["activeTab", "clipboardWrite", "scripting", "storage"].sort(),
  );
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
  assert.ok(
    manifest.content_security_policy.extension_pages.includes(
      "connect-src 'self'",
    ),
  );
  assert.ok(
    !manifest.content_security_policy.extension_pages.includes("'unsafe-eval'"),
  );
});
test("every runtime entry and offline engine variant is packaged", async () => {
  const files = [
    "editor.html",
    "editor.js",
    "popup.html",
    "popup.js",
    "background.js",
    "selection.js",
    "style.css",
    "sample.png",
    "vendor/worker.min.js",
    "vendor/lang/eng.traineddata.gz",
    "licenses/tesseract.js-LICENSE.txt",
    "licenses/tesseract-core-LICENSE.txt",
    "licenses/tessdata-LICENSE.txt",
    ...Object.values(manifest.icons),
  ];
  for (const variant of [
    "tesseract-core",
    "tesseract-core-simd",
    "tesseract-core-relaxedsimd",
  ])
    for (const suffix of [".wasm", ".wasm.js"])
      files.push(`vendor/core/${variant}${suffix}`);
  for (const file of files)
    assert.ok((await fs.stat(path.join(root, "dist", file))).size > 0, file);
});
test("bundled English data exactly matches the pinned official file", async () => {
  const lock = JSON.parse(
    await fs.readFile(path.join(root, "assets.lock.json"), "utf8"),
  );
  const data = gunzipSync(
    await fs.readFile(path.join(root, "dist/vendor/lang/eng.traineddata.gz")),
  );
  assert.equal(createHash("sha256").update(data).digest("hex"), lock.sha256);
  assert.equal(data.length, lock.bytes);
});
test("OCR is explicitly non-neural and uses local worker resources", async () => {
  const source = await fs.readFile(path.join(root, "src/lib/ocr.js"), "utf8");
  assert.match(source, /OEM\.TESSERACT_ONLY/);
  assert.match(source, /workerBlobURL:\s*false/);
  assert.match(source, /cacheMethod:\s*"none"/);
  assert.ok(!source.includes("https://"));
});
