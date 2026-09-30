import { saveCapture, deleteCapture, pruneCaptures } from "./lib/storage.js";
import { validateRegion } from "./lib/geometry.js";

let capturing = false;
const extensionOrigin = chrome.runtime.getURL("");
const editorJobs = new Map();

export function isExtensionPage(sender) {
  return (
    sender.id === chrome.runtime.id &&
    typeof sender.url === "string" &&
    sender.url.startsWith(extensionOrigin) &&
    !sender.tab?.url?.startsWith("http")
  );
}
async function currentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id || !Number.isInteger(tab.windowId))
    throw new Error("Open a browser tab first.");
  return tab;
}
async function assertActive(tab) {
  const [active] = await chrome.tabs.query({
    active: true,
    windowId: tab.windowId,
  });
  if (active?.id !== tab.id)
    throw new Error(
      "The active tab changed. Return to the source tab and capture again.",
    );
}
async function openEditor(tab, region) {
  if (capturing) throw new Error("A capture is already being prepared.");
  capturing = true;
  let id;
  try {
    await assertActive(tab);
    const image = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
    await assertActive(tab);
    if (image.length > 40 * 1024 * 1024)
      throw new Error(
        "This screenshot is too large. Use a smaller browser window or import a smaller image.",
      );
    id = crypto.randomUUID();
    await saveCapture({ id, image, region, createdAt: Date.now() });
    const editor = await chrome.tabs.create({
      url: chrome.runtime.getURL(`editor.html?capture=${id}`),
      windowId: tab.windowId,
    });
    if (editor.id) editorJobs.set(editor.id, id);
    return { ok: true };
  } catch (error) {
    if (id) await deleteCapture(id).catch(() => {});
    throw error;
  } finally {
    capturing = false;
  }
}
async function selectRegion(tab) {
  if (
    !/^https?:\/\//i.test(tab.url || "") ||
    /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/.test(
      tab.url || "",
    )
  ) {
    throw new Error(
      "Chrome blocks selection on this page. Use Capture visible tab, then crop it in the editor.",
    );
  }
  await assertActive(tab);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["selection.js"],
  });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    !message ||
    typeof message.type !== "string"
  )
    return false;
  const regionMessage = message.type === "CAPTURE_REGION";
  if (regionMessage) {
    if (
      !sender.tab?.id ||
      sender.frameId !== 0 ||
      !validateRegion(message.region)
    ) {
      sendResponse({ ok: false, error: "Invalid capture selection." });
      return false;
    }
  } else if (!isExtensionPage(sender)) return false;
  const supported = [
    "SELECT_REGION",
    "CAPTURE_VISIBLE",
    "OPEN_EDITOR",
    "CAPTURE_REGION",
  ];
  if (!supported.includes(message.type)) return false;
  (async () => {
    if (regionMessage) return openEditor(sender.tab, message.region);
    if (message.type === "OPEN_EDITOR") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
      return { ok: true };
    }
    const tab = await currentTab();
    return message.type === "SELECT_REGION"
      ? selectRegion(tab)
      : openEditor(tab, null);
  })().then(sendResponse, (error) =>
    sendResponse({
      ok: false,
      error: error.message || "Capture failed. Please try again.",
    }),
  );
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-region") return;
  try {
    await selectRegion(await currentTab());
  } catch (error) {
    await chrome.tabs.create({
      url: chrome.runtime.getURL(
        `editor.html?error=${encodeURIComponent(error.message)}`,
      ),
    });
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  const id = editorJobs.get(tabId);
  if (id) {
    editorJobs.delete(tabId);
    void deleteCapture(id);
  }
});
chrome.runtime.onStartup.addListener(() => {
  void pruneCaptures();
});
chrome.runtime.onInstalled.addListener(() => {
  void pruneCaptures();
});
