const DB_NAME = "texttap-captures";
const MAX_AGE = 30 * 60 * 1000;
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("captures", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("captures", mode);
    let result;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Local capture storage failed."));
    };
    action(tx.objectStore("captures"), (value) => {
      result = value;
    });
  });
}
export async function pruneCaptures(now = Date.now()) {
  return transact("readwrite", (store) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (now - cursor.value.createdAt > MAX_AGE) cursor.delete();
      cursor.continue();
    };
  });
}
export async function saveCapture(capture) {
  await pruneCaptures();
  // Only pending transfers live here. Editors consume (read+delete) atomically.
  return transact("readwrite", (store) => store.put(capture));
}
export async function takeCapture(id) {
  return transact("readwrite", (store, done) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const capture = request.result;
      store.delete(id);
      done(
        capture && Date.now() - capture.createdAt <= MAX_AGE ? capture : null,
      );
    };
  });
}
export async function deleteCapture(id) {
  return transact("readwrite", (store) => store.delete(id));
}

export const defaultSettings = {
  segmentation: "auto",
  enhance: true,
  rotation: "0",
  format: "paragraphs",
};
export async function getSettings() {
  if (!globalThis.chrome?.storage?.local) return { ...defaultSettings };
  const result = await chrome.storage.local.get("settings");
  const input = result.settings || {};
  return {
    segmentation: ["auto", "block", "sparse", "line"].includes(
      input.segmentation,
    )
      ? input.segmentation
      : "auto",
    enhance: input.enhance !== false,
    rotation: ["0", "90", "180", "270"].includes(input.rotation)
      ? input.rotation
      : "0",
    format: ["paragraphs", "lines", "markdown", "table", "raw"].includes(
      input.format,
    )
      ? input.format
      : "paragraphs",
  };
}
export async function saveSettings(settings) {
  if (globalThis.chrome?.storage?.local)
    await chrome.storage.local.set({ settings });
}
