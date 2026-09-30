import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorker, OEM, PSM } from "tesseract.js";
import { formatText, summarize } from "../src/lib/format.js";
const root = fileURLToPath(new URL("..", import.meta.url));

test(
  "real legacy OCR recognizes the packaged fixture entirely offline",
  { timeout: 90_000 },
  async () => {
    const worker = await createWorker("eng", OEM.TESSERACT_ONLY, {
      langPath: path.join(root, "dist/vendor/lang"),
      cacheMethod: "none",
      legacyCore: true,
      legacyLang: true,
      gzip: true,
    });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const { data } = await worker.recognize(
        path.join(root, "dist/sample.png"),
        {},
        { text: true, blocks: true, tsv: true },
      );
      for (const phrase of [
        "A little less retyping.",
        "No cloud service.",
        "Capture a clear image.",
        "Review the extracted text.",
        "Copy it wherever you need it.",
        "Your words stay yours.",
      ])
        assert.ok(
          data.text.includes(phrase),
          `Missing ${phrase} in ${data.text}`,
        );
      assert.ok(data.blocks?.length);
      assert.ok(data.tsv);
      assert.ok(summarize(data).confidence >= 80);
      const formatted = formatText(data);
      assert.ok(formatted.includes("\n\n"));
      assert.ok(formatted.includes("1. Capture"));
      console.log(
        `Legacy OCR confidence: ${summarize(data).confidence}%. ${summarize(data).words} words. No network paths configured.`,
      );
    } finally {
      await worker.terminate();
    }
  },
);
