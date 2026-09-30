import test from "node:test";
import assert from "node:assert/strict";
import {
  formatText,
  richHtml,
  spreadsheetSafe,
  summarize,
} from "../src/lib/format.js";

const word = (text, x, y, w = 40, h = 20, confidence = 95) => ({
  text,
  confidence,
  bbox: { x0: x, y0: y, x1: x + w, y1: y + h },
});
const line = (text, words = []) => ({ text, words });
const data = (paragraphs) => ({
  text: paragraphs.map((p) => p.map((l) => l.text).join("\n")).join("\n\n"),
  confidence: 92,
  blocks: [{ paragraphs: paragraphs.map((lines) => ({ lines })) }],
});
test("reflows wrapped lines but preserves paragraphs and lists", () => {
  const input = data([
    [line("This is a wrapped"), line("paragraph.")],
    [line("1. First item"), line("continued"), line("2. Second item")],
  ]);
  assert.equal(
    formatText(input),
    "This is a wrapped paragraph.\n\n1. First item continued\n2. Second item",
  );
  assert.equal(
    formatText(input, "lines"),
    "This is a wrapped\nparagraph.\n\n1. First item\ncontinued\n2. Second item",
  );
});
test("never guesses spelling or silently deletes visible hyphens", () => {
  assert.equal(
    formatText(data([[line("multi-"), line("line texl")]])),
    "multi- line texl",
  );
});
test("retains engine block order for multi-column documents", () => {
  const input = {
    text: "",
    blocks: [
      { paragraphs: [{ lines: [line("left top"), line("left bottom")] }] },
      { paragraphs: [{ lines: [line("right top"), line("right bottom")] }] },
    ],
  };
  assert.equal(
    formatText(input),
    "left top left bottom\n\nright top right bottom",
  );
});
test("table rows use geometry and preserve a missing cell", () => {
  const input = data([
    [
      line("Item Qty Price", [
        word("Item", 10, 10),
        word("Qty", 160, 10),
        word("Price", 270, 10),
      ]),
    ],
    [
      line("Tea 2 4.00", [
        word("Tea", 10, 45),
        word("2", 160, 45, 12),
        word("4.00", 270, 45),
      ]),
    ],
    [line("Coffee 5.00", [word("Coffee", 10, 80, 60), word("5.00", 270, 80)])],
  ]);
  assert.equal(
    formatText(input, "table"),
    "Item\tQty\tPrice\nTea\t2\t4.00\nCoffee\t\t5.00",
  );
});
test("rich output escapes all OCR-supplied markup", () => {
  assert.equal(
    richHtml('<img src=x onerror="alert(1)">', "paragraphs"),
    "<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>",
  );
  assert.ok(!richHtml("<script>\tx\ny\tz", "table").includes("<script>"));
});
test("spreadsheet exports neutralize formulas without rewriting OCR data", () => {
  assert.equal(
    spreadsheetSafe("=1+1\tSAFE\n-12\t@SUM(A1)"),
    "'=1+1\tSAFE\n'-12\t'@SUM(A1)",
  );
});
test("Markdown headings are inferred only from substantially larger text", () => {
  const input = data([
    [
      line("A Heading", [
        word("A", 0, 0, 20, 40),
        word("Heading", 30, 0, 160, 40),
      ]),
    ],
    [
      line("Ordinary body text", [
        word("Ordinary", 0, 60, 80, 20),
        word("body", 90, 60, 50, 20),
        word("text", 150, 60, 40, 20),
      ]),
    ],
  ]);
  assert.equal(
    formatText(input, "markdown"),
    "## A Heading\n\nOrdinary body text",
  );
});
test("fallback handles plain output and empty captures", () => {
  assert.equal(
    formatText({ text: "first\r\nline\r\n\r\nnext" }),
    "first line\n\nnext",
  );
  assert.equal(formatText({ text: "", blocks: [] }), "");
});
test("low-confidence words are exposed rather than silently corrected", () => {
  const input = data([
    [line("good texl", [word("good", 0, 0), word("texl", 80, 0, 40, 20, 31)])],
  ]);
  assert.deepEqual(summarize(input).uncertain, ["texl"]);
});

test("rich copy produces semantic ordered and unordered lists", () => {
  assert.equal(
    richHtml("3. Third\n4. Fourth", "paragraphs"),
    '<ol start="3"><li>Third</li><li>Fourth</li></ol>',
  );
  assert.equal(
    richHtml("• One\n• Two", "paragraphs"),
    "<ul><li>One</li><li>Two</li></ul>",
  );
});
