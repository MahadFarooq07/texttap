import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import sharp from "sharp";
import { getLanguage } from "./assets.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = path.resolve(root, "dist");
if (path.dirname(out) !== root || path.basename(out) !== "dist")
  throw new Error("Refusing to clean an unexpected output directory.");
const language = await getLanguage();
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
await fs.cp(path.join(root, "public"), out, { recursive: true });
await fs.copyFile(
  path.join(root, "manifest.json"),
  path.join(out, "manifest.json"),
);
await build({
  absWorkingDir: root,
  entryPoints: ["src/background.js", "src/popup.js"],
  outdir: out,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome116",
  minify: false,
  sourcemap: false,
  legalComments: "external",
  metafile: true,
}).then((result) =>
  fs.writeFile(
    path.join(root, ".cache", "build-meta.json"),
    JSON.stringify(result.metafile, null, 2),
  ),
);
await build({
  absWorkingDir: root,
  entryPoints: ["src/selection.js"],
  outfile: path.join(out, "selection.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome116",
});
await build({
  absWorkingDir: root,
  entryPoints: ["src/editor.js", "src/offscreen.js"],
  outdir: out,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome116",
  legalComments: "external",
});
const require = createRequire(import.meta.url);
const tesseract = path.dirname(require.resolve("tesseract.js/package.json"));
const core = path.dirname(require.resolve("tesseract.js-core/package.json"));
await fs.mkdir(path.join(out, "vendor/core"), { recursive: true });
await fs.mkdir(path.join(out, "vendor/lang"), { recursive: true });
await fs.copyFile(
  path.join(tesseract, "dist/worker.min.js"),
  path.join(out, "vendor/worker.min.js"),
);
await fs.copyFile(
  path.join(tesseract, "dist/worker.min.js.LICENSE.txt"),
  path.join(out, "vendor/worker.min.js.LICENSE.txt"),
);
// OEM 0 needs the full legacy-capable core. Include every CPU-selected variant
// but omit LSTM-only builds, which cannot execute this extension's recognizer.
for (const variant of [
  "tesseract-core",
  "tesseract-core-simd",
  "tesseract-core-relaxedsimd",
]) {
  for (const suffix of [".wasm.js", ".wasm"])
    await fs.copyFile(
      path.join(core, variant + suffix),
      path.join(out, "vendor/core", variant + suffix),
    );
}
await fs.writeFile(
  path.join(out, "vendor/lang/eng.traineddata.gz"),
  gzipSync(language, { level: 9 }),
);
await fs.mkdir(path.join(out, "licenses"), { recursive: true });
await fs.cp(path.join(root, "licenses"), path.join(out, "licenses"), {
  recursive: true,
});
await fs.copyFile(
  path.join(tesseract, "LICENSE.md"),
  path.join(out, "licenses/tesseract.js-LICENSE.txt"),
);
await fs.copyFile(
  path.join(core, "LICENSE"),
  path.join(out, "licenses/tesseract-core-LICENSE.txt"),
);
await fs.copyFile(
  path.join(root, "assets.lock.json"),
  path.join(out, "licenses/assets.lock.json"),
);
await fs.copyFile(
  path.join(root, "THIRD_PARTY_NOTICES.md"),
  path.join(out, "licenses/THIRD_PARTY_NOTICES.md"),
);
await fs.mkdir(path.join(out, "icons"), { recursive: true });
const icon = Buffer.from(
  `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="b" x2="0" y2="1"><stop stop-color="#3599ff"/><stop offset="1" stop-color="#0864e8"/></linearGradient></defs><rect width="128" height="128" rx="32" fill="url(#b)"/><g fill="none" stroke="white" stroke-width="6" stroke-linecap="round"><path d="M32 46V32h14m36 0h14v14M32 82v14h14m36 0h14V82M48 52h32M64 52v32"/></g></svg>`,
);
for (const size of [16, 32, 48, 128])
  await sharp(icon)
    .resize(size, size)
    .png()
    .toFile(path.join(out, `icons/${size}.png`));
const sample = Buffer.from(
  `<svg width="1400" height="760" xmlns="http://www.w3.org/2000/svg"><rect width="1400" height="760" fill="white"/><g fill="#222" font-family="Arial, sans-serif"><text x="85" y="125" font-size="58" font-weight="bold">A little less retyping.</text><text x="85" y="225" font-size="36">TextTap reads text from images on your device.</text><text x="85" y="283" font-size="36">No cloud service. No account. No subscription.</text><text x="85" y="400" font-size="36">1. Capture a clear image.</text><text x="85" y="458" font-size="36">2. Review the extracted text.</text><text x="85" y="516" font-size="36">3. Copy it wherever you need it.</text><text x="85" y="650" font-size="32">Your words stay yours.</text></g></svg>`,
);
await sharp(sample).png().toFile(path.join(out, "sample.png"));
console.log(`Built Chrome MV3 extension: ${out}`);
