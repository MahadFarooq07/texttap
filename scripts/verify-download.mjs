import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const downloads = path.join(root, "public", "downloads");
const release = JSON.parse(await readFile(path.join(downloads, "latest.json"), "utf8"));
const zip = await readFile(path.join(downloads, release.file));
const hash = createHash("sha256").update(zip).digest("hex");
if (hash !== release.sha256 || zip.length !== release.size || zip[0] !== 0x50 || zip[1] !== 0x4b) throw new Error("Published extension ZIP failed its file, size, or SHA-256 check.");
if (release.file !== `texttap-${release.version}.zip` || !release.minimumChromeVersion) throw new Error("Published extension metadata is inconsistent.");
console.log(`Download verified: ${release.file} (${zip.length} bytes, SHA-256 ${hash}).`);
