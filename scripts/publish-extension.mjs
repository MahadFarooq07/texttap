import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ext = path.join(root, "chrome-extension");
const require = createRequire(path.join(ext, "package.json"));
const { unzipSync } = require("fflate");
const run = (args) => {
  const result = spawnSync("npm", args, { cwd: ext, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed`);
};
run(["run", "build"]);
run(["run", "package"]);
const manifest = JSON.parse(await readFile(path.join(ext, "manifest.json"), "utf8"));
const zip = await readFile(path.join(ext, "release", `texttap-${manifest.version}.zip`));
const archive = unzipSync(zip);
const bundledManifest = JSON.parse(new TextDecoder().decode(archive["manifest.json"]));
if (bundledManifest.version !== manifest.version) throw new Error("ZIP version does not match source manifest.");
const downloads = path.join(root, "public", "downloads");
await mkdir(downloads, { recursive: true });
const filename = `texttap-${manifest.version}.zip`;
await copyFile(path.join(ext, "release", filename), path.join(downloads, filename));
const sha256 = createHash("sha256").update(zip).digest("hex");
await writeFile(path.join(downloads, "latest.json"), JSON.stringify({ name: "TextTap for Chrome", version: manifest.version, file: filename, sha256, size: zip.length, minimumChromeVersion: manifest.minimum_chrome_version }, null, 2) + "\n");
console.log(`Published ${filename} (${zip.length} bytes, SHA-256 ${sha256}) to public/downloads.`);
