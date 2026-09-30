import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("..", import.meta.url));
const lock = JSON.parse(
  await fs.readFile(path.join(root, "assets.lock.json"), "utf8"),
);
export async function getLanguage() {
  const target = path.join(root, ".cache", "eng.traineddata");
  let data;
  try {
    data = await fs.readFile(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!data) {
    console.log(
      "Downloading official English recognition data (first build only)…",
    );
    const response = await fetch(lock.source, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok)
      throw new Error(`Language download failed (${response.status}).`);
    data = Buffer.from(await response.arrayBuffer());
  }
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== lock.sha256 || data.length !== lock.bytes)
    throw new Error(
      "OCR language data integrity check failed. The source does not match assets.lock.json.",
    );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return data;
}
