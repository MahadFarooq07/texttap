import { recognizeAndCopy } from "../src/lib/capture.js";
import { copyFormatted } from "../src/lib/clipboard.js";

// Observe the real synchronous copy event without replacing execCommand.
const payload = {},
  listeners = new Map();
const observedDocument = {
  body: document.body,
  createElement: (tag) => document.createElement(tag),
  addEventListener(type, handler) {
    const observe = (event) => {
      handler(event);
      payload.plain = event.clipboardData.getData("text/plain");
      payload.html = event.clipboardData.getData("text/html");
    };
    listeners.set(handler, observe);
    document.addEventListener(type, observe);
  },
  removeEventListener(type, handler) {
    document.removeEventListener(type, listeners.get(handler));
    listeners.delete(handler);
  },
  execCommand: (command) => document.execCommand(command),
};

const status = document.getElementById("status"),
  button = document.getElementById("run");
button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Reading locally…";
  try {
    const image = await (await fetch("sample.png")).blob();
    const result = await recognizeAndCopy(
      {
        image,
        settings: {
          format: "paragraphs",
          segmentation: "auto",
          enhance: true,
          rotation: "0",
        },
      },
      {
        copy: (text, format) => copyFormatted(text, format, observedDocument),
      },
    );
    document.getElementById("payload").textContent = JSON.stringify(
      payload,
      null,
      2,
    );
    status.textContent = `Copied ${result.words} words. Paste into both fields to check the clipboard.`;
  } catch (error) {
    status.textContent = `Failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
