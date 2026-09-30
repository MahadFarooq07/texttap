import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const compiled = await build({
  absWorkingDir: fileURLToPath(new URL("..", import.meta.url)),
  entryPoints: ["src/offscreen.js"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  plugins: [
    {
      name: "capture-test",
      setup(builder) {
        builder.onResolve({ filter: /lib\/capture\.js$/ }, () => ({
          path: "capture",
          namespace: "mock",
        }));
        builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export const recognizeAndCopy = message => processCapture(message);",
          loader: "js",
        }));
      },
    },
  ],
});
function harness(processCapture = async () => ({ ok: true, words: 4 })) {
  let listener,
    heartbeat,
    cleared = false;
  vm.runInNewContext(compiled.outputFiles[0].text, {
    processCapture,
    setInterval: (fn, ms) => {
      assert.equal(ms, 20_000);
      heartbeat = fn;
      return 1;
    },
    clearInterval: () => {
      cleared = true;
    },
    chrome: {
      runtime: {
        id: "own",
        getURL: (file) => `chrome-extension://own/${file}`,
        onMessage: {
          addListener: (fn) => {
            listener = fn;
          },
        },
        sendMessage: async () => ({ ok: true }),
      },
    },
  });
  const send = (
    sender,
    message = { target: "offscreen", type: "RECOGNIZE_AND_COPY" },
  ) =>
    new Promise((resolve) => {
      if (!listener(message, sender, resolve)) resolve(undefined);
    });
  return {
    send,
    get cleared() {
      return cleared;
    },
    get heartbeat() {
      return heartbeat;
    },
  };
}
test("hidden OCR rejects external pages, content scripts, and popup senders", async () => {
  const h = harness(() => {
    throw new Error("Should not run");
  });
  for (const sender of [
    { id: "other" },
    { id: "own", tab: { id: 1 } },
    { id: "own", url: "chrome-extension://own/popup.html" },
  ])
    assert.equal(await h.send(sender), undefined);
});
test("service worker jobs succeed and clear their heartbeat, with or without a sender URL", async () => {
  for (const sender of [
    { id: "own" },
    { id: "own", url: "chrome-extension://own/background.js" },
  ]) {
    const h = harness();
    assert.equal((await h.send(sender)).ok, true);
    await new Promise(setImmediate);
    assert.equal(typeof h.heartbeat, "function");
    assert.equal(h.cleared, true);
  }
});
test("recognition errors reply without leaving a heartbeat running", async () => {
  const h = harness(async () => {
    throw new Error("Worker failed");
  });
  const result = await h.send({ id: "own" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Worker failed");
  await new Promise(setImmediate);
  assert.equal(h.cleared, true);
});
