const LIST = /^(?:[-*•●▪‣]|\d{1,3}[.)]|[a-zA-Z][.)])\s+/;
const clean = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const median = (values) => {
  const v = values
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 16;
};

export function paragraphsOf(data) {
  const paragraphs = [];
  for (const block of data.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      const lines = (paragraph.lines || [])
        .map((line) => ({ ...line, text: clean(line.text).trim() }))
        .filter((line) => line.text);
      if (lines.length) paragraphs.push({ lines, bbox: paragraph.bbox });
    }
  }
  if (paragraphs.length) return paragraphs;
  return clean(data.text)
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((text) => ({
      lines: text
        .split("\n")
        .map((text) => ({ text: text.trim(), words: [] }))
        .filter((line) => line.text),
    }));
}

// Only join within engine-supplied paragraphs. Never guess corrected words,
// remove hard hyphens, rewrite sentences, or globally sort multi-column blocks.
function reflow(lines) {
  const result = [];
  for (const line of lines) {
    const text = line.text.replace(/[ \t]+/g, " ").trim();
    if (!result.length || LIST.test(text)) result.push(text);
    else result[result.length - 1] += ` ${text}`;
  }
  return result.join("\n");
}

function tableRows(data) {
  const lines = paragraphsOf(data).flatMap((p) => p.lines);
  const words = lines
    .flatMap((l) => l.words || [])
    .filter((w) => w.text?.trim() && w.bbox);
  if (!words.length)
    return lines.map((l) => l.text.replace(/ {2,}|\t+/g, "\t"));
  const height = median(words.map((w) => w.bbox.y1 - w.bbox.y0));
  const charWidth = median(
    words.map((w) => (w.bbox.x1 - w.bbox.x0) / Math.max(1, w.text.length)),
  );
  // Tables require geometric row grouping across paragraphs/blocks. This is
  // explicitly selected by the user; normal prose keeps OCR reading order.
  const rows = [];
  for (const word of [...words].sort(
    (a, b) => a.bbox.y0 + a.bbox.y1 - (b.bbox.y0 + b.bbox.y1),
  )) {
    const center = (word.bbox.y0 + word.bbox.y1) / 2;
    let row = rows.find((r) => Math.abs(r.center - center) < height * 0.55);
    if (!row) {
      row = { center, words: [] };
      rows.push(row);
    }
    row.words.push(word);
  }
  const cellRows = rows.map((row) => {
    const sorted = row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const cells = [];
    let previous;
    for (const word of sorted) {
      if (
        !previous ||
        word.bbox.x0 - previous.bbox.x1 >
          Math.max(charWidth * 2.7, height * 0.75)
      )
        cells.push({ x: word.bbox.x0, text: word.text });
      else cells[cells.length - 1].text += ` ${word.text}`;
      previous = word;
    }
    return cells;
  });
  const anchors = [];
  for (const cells of cellRows)
    for (const cell of cells) {
      if (!anchors.some((x) => Math.abs(x - cell.x) <= height))
        anchors.push(cell.x);
    }
  anchors.sort((a, b) => a - b);
  return cellRows.map((cells) => {
    const row = Array(anchors.length).fill("");
    for (const cell of cells) {
      let index = 0;
      for (let i = 1; i < anchors.length; i++)
        if (Math.abs(anchors[i] - cell.x) < Math.abs(anchors[index] - cell.x))
          index = i;
      row[index] += (row[index] ? " " : "") + cell.text;
    }
    return row.join("\t");
  });
}

export function formatText(data, mode = "paragraphs") {
  if (mode === "raw") return clean(data.text).trim();
  if (mode === "table") return tableRows(data).join("\n");
  const paragraphs = paragraphsOf(data);
  if (mode === "lines")
    return paragraphs
      .map((p) => p.lines.map((l) => l.text).join("\n"))
      .join("\n\n");
  const baseHeight = median(
    paragraphs
      .flatMap((p) => p.lines)
      .flatMap((l) =>
        (l.words || []).map((w) => (w.bbox ? w.bbox.y1 - w.bbox.y0 : 0)),
      ),
  );
  return paragraphs
    .map((p) => {
      const text = reflow(p.lines);
      if (mode !== "markdown") return text;
      const lineHeight = median(
        (p.lines[0]?.words || []).map((w) =>
          w.bbox ? w.bbox.y1 - w.bbox.y0 : 0,
        ),
      );
      const heading =
        p.lines.length === 1 &&
        text.length < 100 &&
        lineHeight > baseHeight * 1.4 &&
        !LIST.test(text);
      const escaped = text.replace(/[\\`*_\[\]<>]/g, "\\$&");
      return (heading ? "## " : "") + escaped.replace(/^[•●▪‣]\s+/gm, "- ");
    })
    .join("\n\n");
}

export function richHtml(text, mode) {
  const safe = escapeHtml(text);
  if (mode === "table") {
    // Prefix spreadsheet formula-like cell values on export, never silently
    // alter the underlying OCR text. HTML is escaped, never trusted OCR markup.
    return `<table><tbody>${safe
      .split("\n")
      .map(
        (row) =>
          `<tr>${row
            .split("\t")
            .map((cell) => `<td>${cell}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody></table>`;
  }
  if (mode === "lines" || mode === "raw")
    return `<pre style="white-space:pre-wrap;font-family:monospace">${safe}</pre>`;
  return safe
    .split(/\n\s*\n/)
    .map((p) => {
      if (mode === "markdown" && p.startsWith("## "))
        return `<h2>${p.slice(3)}</h2>`;
      const lines = p.split("\n");
      if (lines.every((line) => /^(?:[-*•●▪‣])\s+/.test(line)))
        return `<ul>${lines.map((line) => `<li>${line.replace(/^(?:[-*•●▪‣])\s+/, "")}</li>`).join("")}</ul>`;
      if (lines.every((line) => /^\d{1,3}[.)]\s+/.test(line)))
        return `<ol start="${parseInt(lines[0], 10)}">${lines.map((line) => `<li>${line.replace(/^\d{1,3}[.)]\s+/, "")}</li>`).join("")}</ol>`;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

export function spreadsheetSafe(text) {
  return text
    .split("\n")
    .map((row) =>
      row
        .split("\t")
        .map((cell) => (/^[\s]*[=+@-]/.test(cell) ? "'" + cell : cell))
        .join("\t"),
    )
    .join("\n");
}
export function summarize(data) {
  const words = paragraphsOf(data)
    .flatMap((p) => p.lines)
    .flatMap((l) => l.words || [])
    .filter((w) => w.text?.trim());
  return {
    confidence: Math.round(Number(data.confidence) || 0),
    words:
      words.length ||
      clean(data.text).trim().split(/\s+/).filter(Boolean).length,
    uncertain: words
      .filter((w) => w.confidence < 65)
      .map((w) => w.text)
      .slice(0, 30),
    paragraphs: paragraphsOf(data).length,
  };
}
