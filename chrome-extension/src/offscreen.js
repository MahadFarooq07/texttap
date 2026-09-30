import { recognizeAndCopy } from "./lib/capture.js";

let busy = false;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    (sender.url && sender.url !== chrome.runtime.getURL("background.js")) ||
    message?.target !== "offscreen" ||
    message.type !== "RECOGNIZE_AND_COPY"
  )
    return false;
  if (busy) {
    sendResponse({ ok: false, error: "Recognition is already running." });
    return false;
  }
  busy = true;
  // Messages from an offscreen document keep the MV3 worker alive during OCR.
  const heartbeat = setInterval(() => {
    void chrome.runtime
      .sendMessage({ target: "background", type: "OCR_HEARTBEAT" })
      .catch(() => {});
  }, 20_000);
  recognizeAndCopy(message)
    .then(sendResponse, (error) =>
      sendResponse({ ok: false, error: error.message }),
    )
    .finally(() => {
      clearInterval(heartbeat);
      busy = false;
    });
  return true;
});
