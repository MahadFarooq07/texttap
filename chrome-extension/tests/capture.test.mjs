import test from "node:test";
import assert from "node:assert/strict";
import { recognizeAndCopy } from "../src/lib/capture.js";
import { copyFormatted } from "../src/lib/clipboard.js";

function documentHarness({ commandWorks = true } = {}) {
  const handlers = new Map(),
    values = new Map();
  let removed = false;
  return {
    values,
    get removed() {
      return removed;
    },
    handlers,
    body: { append() {} },
    createElement: () => ({
      select() {},
      remove() {
        removed = true;
      },
    }),
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
    execCommand: () => {
      if (!commandWorks) return false;
      handlers.get("copy")({
        preventDefault() {},
        clipboardData: { setData: (type, text) => values.set(type, text) },
      });
      return true;
    },
  };
}
test("clipboard carries rich paragraphs and lists alongside plain text", () => {
  const doc = documentHarness();
  const text = "An introduction.\n\n• One\n• Two";
  copyFormatted(text, "paragraphs", doc);
  assert.equal(doc.values.get("text/plain"), text);
  assert.equal(
    doc.values.get("text/html"),
    "<p>An introduction.</p><ul><li>One</li><li>Two</li></ul>",
  );
  assert.equal(doc.removed, true);
  assert.equal(doc.handlers.size, 0);
});
test("table copy neutralizes spreadsheet formulas in both clipboard representations", () => {
  const doc = documentHarness();
  copyFormatted("Name\tAmount\nAlice\t=1+1", "table", doc);
  assert.equal(doc.values.get("text/plain"), "Name\tAmount\nAlice\t'=1+1");
  assert.match(doc.values.get("text/html"), /<td>(?:&#39;|')=1\+1<\/td>/);
});
test("clipboard failure is reported and temporary DOM is removed", () => {
  const doc = documentHarness({ commandWorks: false });
  assert.throws(
    () => copyFormatted("Hello", "paragraphs", doc),
    /Clipboard copy failed/,
  );
  assert.equal(doc.removed, true);
  assert.equal(doc.handlers.size, 0);
});
test("recognition crops the selected area and copies only the formatted result", async () => {
  const copied = [],
    region = { x: 1 },
    calls = [];
  const result = await recognizeAndCopy(
    { image: "capture", region, settings: { format: "lines" } },
    {
      decode: async (value) => {
        assert.equal(value, "capture");
        return "decoded";
      },
      crop: (image, selection) => {
        calls.push([image, selection]);
        return "crop";
      },
      prepare: (image) => {
        assert.equal(image, "crop");
        return "prepared";
      },
      engine: {
        recognize: async (image) => {
          assert.equal(image, "prepared");
          return { text: "First line\nSecond line" };
        },
      },
      copy: (text, format) => copied.push([text, format]),
    },
  );
  assert.deepEqual(calls, [["decoded", region]]);
  assert.deepEqual(copied, [["First line\nSecond line", "lines"]]);
  assert.deepEqual(result, { ok: true, words: 4 });
});
for (const failure of ["empty", "ocr-error", "decode-error"]) {
  test(`${failure} leaves the clipboard untouched`, async () => {
    let copied = false;
    await assert.rejects(
      recognizeAndCopy(
        { image: "capture" },
        {
          decode: async () => {
            if (failure === "decode-error") throw new Error("Bad image");
            return "decoded";
          },
          prepare: (value) => value,
          engine: {
            recognize: async () => {
              if (failure === "ocr-error") throw new Error("Worker failed");
              return { text: "   " };
            },
          },
          copy: () => {
            copied = true;
          },
        },
      ),
    );
    assert.equal(copied, false);
  });
}
