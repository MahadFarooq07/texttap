import { pruneCaptures, getSettings } from "./lib/storage.js";
import { validateRegion } from "./lib/geometry.js";

let capturing = false;
const extensionOrigin = chrome.runtime.getURL("");
let lastStatus = {
  state: "idle",
  message: "Select text. Then paste anywhere.",
};

async function updateStatus(state, message) {
  lastStatus = { state, message };
  await chrome.storage.session.set({ captureStatus: lastStatus });
  await chrome.action.setBadgeText({
    text: state === "reading" ? "…" : state === "done" ? "✓" : "!",
  });
  await chrome.action.setBadgeBackgroundColor({
    color: state === "error" ? "#b42318" : "#0878f9",
  });
  await chrome.action.setTitle({ title: `TextTap — ${message}` });
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")],
  });
  if (!contexts.length)
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD", "WORKERS", "BLOBS"],
      justification:
        "Recognize the user-selected screenshot locally and copy formatted text without opening a tab.",
    });
}

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
async function captureAndCopy(tab, region) {
  if (capturing) throw new Error("A capture is already being prepared.");
  capturing = true;
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
    await updateStatus("reading", "Reading your selection on this device…");
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "RECOGNIZE_AND_COPY",
      image,
      region,
      settings: await getSettings(),
    });
    if (!result?.ok)
      throw new Error(result?.error || "Could not copy the recognized text.");
    await updateStatus("done", "Copied. Press Ctrl+V (⌘V on Mac) to paste.");
    return { ok: true, copied: true, words: result.words };
  } catch (error) {
    await updateStatus("error", error.message || "Capture failed.").catch(
      () => {},
    );
    throw error;
  } finally {
    // Release workers, image memory, and the hidden document after every job.
    await chrome.offscreen.closeDocument().catch(() => {});
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
      "Chrome blocks selection on this page. Use Capture visible tab to copy its text.",
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
    message?.type === "OCR_HEARTBEAT" &&
    sender.id === chrome.runtime.id &&
    sender.url === chrome.runtime.getURL("offscreen.html")
  ) {
    sendResponse({ ok: true });
    return false;
  }
  if (
    message?.target === "offscreen" ||
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
    "GET_STATUS",
  ];
  if (!supported.includes(message.type)) return false;
  (async () => {
    if (regionMessage) return captureAndCopy(sender.tab, message.region);
    if (message.type === "GET_STATUS") {
      const stored = await chrome.storage.session.get("captureStatus");
      return { ok: true, ...(stored.captureStatus || lastStatus) };
    }
    if (message.type === "OPEN_EDITOR") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
      return { ok: true };
    }
    const tab = await currentTab();
    return message.type === "SELECT_REGION"
      ? selectRegion(tab)
      : captureAndCopy(tab, null);
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
    await updateStatus("error", error.message).catch(() => {});
  }
});
chrome.runtime.onStartup.addListener(() => {
  void pruneCaptures();
});
chrome.runtime.onInstalled.addListener(() => {
  void pruneCaptures();
});
