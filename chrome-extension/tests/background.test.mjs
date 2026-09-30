import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const compiled = await build({
  absWorkingDir: root,
  entryPoints: ["src/background.js"],
  write: false,
  bundle: true,
  format: "iife",
  platform: "browser",
  plugins: [
    {
      name: "test-storage",
      setup(builder) {
        builder.onResolve({ filter: /lib\/storage\.js$/ }, () => ({
          path: "storage",
          namespace: "mock",
        }));
        builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            'export const pruneCaptures = () => Promise.resolve(); export const getSettings = () => Promise.resolve({ format: "paragraphs", segmentation: "auto" });',
          loader: "js",
        }));
      },
    },
  ],
});

function harness({
  activeIds = [7, 7, 7],
  captureError = null,
  createError = null,
  recognitionError = null,
  contextExists = false,
  pendingRecognition = null,
} = {}) {
  let listener,
    query = 0;
  const saved = [],
    removed = [],
    opened = [],
    injected = [],
    processed = [],
    documents = [],
    badges = [],
    titles = [];
  let closed = 0,
    stored = {};
  const chrome = {
    runtime: {
      id: "extension-id",
      getURL: (path) => "chrome-extension://extension-id/" + path,
      getContexts: async () => (contextExists ? [{}] : []),
      sendMessage: async (message) => {
        processed.push(message);
        if (pendingRecognition) await pendingRecognition;
        return recognitionError
          ? { ok: false, error: recognitionError }
          : { ok: true, words: 4 };
      },
      onMessage: {
        addListener: (fn) => {
          listener = fn;
        },
      },
      onStartup: { addListener() {} },
      onInstalled: { addListener() {} },
    },
    commands: { onCommand: { addListener() {} } },
    storage: {
      session: {
        set: async (value) => Object.assign(stored, value),
        get: async () => stored,
      },
    },
    action: {
      setBadgeText: async (value) => badges.push(value.text),
      setBadgeBackgroundColor: async () => {},
      setTitle: async (value) => titles.push(value.title),
    },
    offscreen: {
      createDocument: async (value) => documents.push(value),
      closeDocument: async () => {
        closed++;
      },
    },
    tabs: {
      query: async () => [
        {
          id: activeIds[Math.min(query++, activeIds.length - 1)],
          windowId: 1,
          url: "https://example.com/",
        },
      ],
      captureVisibleTab: async () => {
        if (captureError) throw new Error(captureError);
        return "data:image/png;base64,TEST";
      },
      create: async (props) => {
        if (createError) throw new Error(createError);
        opened.push(props);
        return { id: 15 };
      },
      onRemoved: { addListener() {} },
    },
    scripting: {
      executeScript: async (props) => {
        injected.push(props);
      },
    },
  };
  vm.runInNewContext(compiled.outputFiles[0].text, {
    chrome,
    crypto: { randomUUID: () => "test-capture-id" },
    testStore: {
      save: async (value) => saved.push(value),
      remove: async (value) => removed.push(value),
    },
    console,
    setTimeout,
    clearTimeout,
  });
  const popup = {
    id: "extension-id",
    url: "chrome-extension://extension-id/popup.html",
  };
  const send = (message, sender = popup) =>
    new Promise((resolve) => {
      const async = listener(message, sender, resolve);
      if (!async) resolve(undefined);
    });
  return {
    send,
    saved,
    removed,
    opened,
    injected,
    processed,
    documents,
    badges,
    titles,
    get closed() {
      return closed;
    },
  };
}
test("visible capture copies through a hidden document without creating a tab or storing a screenshot", async () => {
  const h = harness();
  const reply = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(reply.ok, true);
  assert.equal(reply.copied, true);
  assert.equal(h.saved.length, 0);
  assert.equal(h.opened.length, 0);
  assert.equal(h.processed[0].region, null);
  assert.equal(h.processed[0].url, undefined);
  assert.equal(h.processed[0].target, "offscreen");
  assert.equal(h.processed[0].settings.format, "paragraphs");
  assert.deepEqual(Array.from(h.documents[0].reasons), [
    "CLIPBOARD",
    "WORKERS",
    "BLOBS",
  ]);
  assert.equal(h.closed, 1);
  assert.deepEqual(h.badges, ["…", "✓"]);
});
test("tab changes abort capture before persistence", async () => {
  const h = harness({ activeIds: [7, 7, 8] });
  const reply = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(reply.ok, false);
  assert.match(reply.error, /active tab changed/);
  assert.equal(h.saved.length, 0);
  assert.equal(h.opened.length, 0);
});
test("failed recognition reports an error and releases the hidden document", async () => {
  const h = harness({ recognitionError: "No text found" });
  const reply = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(reply.ok, false);
  assert.equal(reply.error, "No text found");
  assert.equal(h.closed, 1);
  assert.equal(h.opened.length, 0);
  assert.deepEqual(h.badges, ["…", "!"]);
});
test("external senders and web pages cannot invoke privileged popup routes", async () => {
  const h = harness();
  assert.equal(
    await h.send(
      { type: "CAPTURE_VISIBLE" },
      { id: "other", url: "https://evil.example" },
    ),
    undefined,
  );
  assert.equal(
    await h.send(
      { type: "CAPTURE_VISIBLE" },
      { id: "extension-id", url: "https://example.com", tab: { id: 7 } },
    ),
    undefined,
  );
  assert.equal(h.opened.length, 0);
});
test("selection messages require a top-frame tab and valid viewport rectangle", async () => {
  const h = harness();
  const region = {
    x: 10,
    y: 20,
    width: 100,
    height: 80,
    viewportWidth: 800,
    viewportHeight: 600,
  };
  assert.equal(
    (
      await h.send(
        { type: "CAPTURE_REGION", region },
        { id: "extension-id", frameId: 2, tab: { id: 7, windowId: 1 } },
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await h.send(
        { type: "CAPTURE_REGION", region: { ...region, width: -1 } },
        { id: "extension-id", frameId: 0, tab: { id: 7, windowId: 1 } },
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await h.send(
        { type: "CAPTURE_REGION", region },
        { id: "extension-id", frameId: 0, tab: { id: 7, windowId: 1 } },
      )
    ).ok,
    true,
  );
});
test("area selection injects only after an explicit popup request", async () => {
  const h = harness();
  assert.equal(h.injected.length, 0);
  assert.equal((await h.send({ type: "SELECT_REGION" })).ok, true);
  assert.equal(h.injected[0].target.tabId, 7);
  assert.equal(h.injected[0].files[0], "selection.js");
});

test("an existing hidden document is reused and still closed after copying", async () => {
  const h = harness({ contextExists: true });
  assert.equal((await h.send({ type: "CAPTURE_VISIBLE" })).copied, true);
  assert.equal(h.documents.length, 0);
  assert.equal(h.closed, 1);
});
test("only an explicit editor request creates a tab", async () => {
  const h = harness();
  assert.equal((await h.send({ type: "OPEN_EDITOR" })).ok, true);
  assert.equal(h.opened[0].url, "chrome-extension://extension-id/editor.html");
  assert.equal(h.processed.length, 0);
});
test("offscreen messages cannot be handled as privileged capture requests", async () => {
  const h = harness();
  assert.equal(
    await h.send({ type: "CAPTURE_VISIBLE", target: "offscreen" }),
    undefined,
  );
  assert.equal(h.processed.length, 0);
});
test("capture failures do not run OCR and surface in popup status", async () => {
  const h = harness({ captureError: "Capture blocked" });
  assert.equal((await h.send({ type: "CAPTURE_VISIBLE" })).ok, false);
  const status = await h.send({ type: "GET_STATUS" });
  assert.equal(status.state, "error");
  assert.equal(status.message, "Capture blocked");
  assert.equal(h.processed.length, 0);
});
test("overlapping captures cannot overwrite each other's clipboard or close a running document", async () => {
  let finish;
  const pendingRecognition = new Promise((resolve) => {
    finish = resolve;
  });
  const h = harness({ pendingRecognition });
  const first = h.send({ type: "CAPTURE_VISIBLE" });
  await new Promise(setImmediate);
  const second = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(second.ok, false);
  assert.match(second.error, /already/);
  assert.equal(h.closed, 0);
  finish();
  assert.equal((await first).copied, true);
  assert.equal(h.processed.length, 1);
  assert.equal(h.closed, 1);
});
