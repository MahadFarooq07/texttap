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
            "export const saveCapture = capture => testStore.save(capture); export const deleteCapture = id => testStore.remove(id); export const pruneCaptures = () => Promise.resolve();",
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
} = {}) {
  let listener,
    query = 0;
  const saved = [],
    removed = [],
    opened = [],
    injected = [];
  const chrome = {
    runtime: {
      id: "extension-id",
      getURL: (path) => "chrome-extension://extension-id/" + path,
      onMessage: {
        addListener: (fn) => {
          listener = fn;
        },
      },
      onStartup: { addListener() {} },
      onInstalled: { addListener() {} },
    },
    commands: { onCommand: { addListener() {} } },
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
  return { send, saved, removed, opened, injected };
}
test("visible capture is persisted before opening an editor and omits source URL", async () => {
  const h = harness();
  const reply = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(reply.ok, true);
  assert.equal(h.saved.length, 1);
  assert.equal(h.saved[0].region, null);
  assert.equal(h.saved[0].url, undefined);
  assert.match(h.opened[0].url, /editor.html\?capture=test-capture-id/);
});
test("tab changes abort capture before persistence", async () => {
  const h = harness({ activeIds: [7, 7, 8] });
  const reply = await h.send({ type: "CAPTURE_VISIBLE" });
  assert.equal(reply.ok, false);
  assert.match(reply.error, /active tab changed/);
  assert.equal(h.saved.length, 0);
  assert.equal(h.opened.length, 0);
});
test("failed editor creation cleans its unconsumed capture", async () => {
  const h = harness({ createError: "Cannot create tab" });
  assert.equal((await h.send({ type: "CAPTURE_VISIBLE" })).ok, false);
  assert.deepEqual(h.removed, ["test-capture-id"]);
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
