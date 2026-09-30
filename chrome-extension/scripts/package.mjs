import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
const root = fileURLToPath(new URL("..", import.meta.url)),
  dist = path.join(root, "dist");
const files = {};
const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
async function visit(directory, prefix = "") {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory())
      await visit(path.join(directory, item.name), prefix + item.name + "/");
    else
      files[prefix + item.name] = new Uint8Array(
        await fs.readFile(path.join(directory, item.name)),
      );
  }
}
await visit(dist);
if (!files["manifest.json"]) throw new Error("Run npm run build first.");
await fs.mkdir(path.join(root, "release"), { recursive: true });
const target = path.join(root, "release", `texttap-${manifest.version}.zip`);
await fs.writeFile(target, zipSync(files, { level: 6 }));
console.log(target);
