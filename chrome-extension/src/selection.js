// Injected on explicit user invocation, in Chrome's isolated world, top frame only.
// A closed shadow root prevents page styles from changing the capture interface.
(() => {
  const key = "__texttapSelectionCleanup";
  if (globalThis[key]) {
    globalThis[key]();
    return;
  }
  const previousFocus = document.activeElement;
  const host = document.createElement("div");
  host.setAttribute("data-texttap-selection", "");
  host.style.cssText =
    "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;";
  const root = host.attachShadow({ mode: "closed" });
  const style = new CSSStyleSheet();
  style.replaceSync(
    `:host{color-scheme:light}.layer{position:fixed;inset:0;cursor:crosshair;background:rgba(17,35,64,.12);touch-action:none;font:14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.help{position:absolute;top:20px;left:50%;transform:translateX(-50%);padding:13px 18px;border:1px solid #e3e9f4;border-radius:14px;box-shadow:0 8px 30px #102b5130;background:white;color:#28364a;max-width:calc(100vw - 30px)}.help button{margin-left:14px;border:0;border-radius:6px;padding:5px 9px;background:#eef3fa;color:#45607d;cursor:pointer}.box{position:absolute;display:none;border:2px solid #0878f9;background:#0878f91a;box-shadow:0 0 0 99999px #18355528;pointer-events:none}.size{position:absolute;bottom:-29px;left:0;background:#fff;color:#315782;padding:4px 7px;border-radius:5px;white-space:nowrap;font-size:12px}`,
  );
  root.adoptedStyleSheets = [style];
  const layer = document.createElement("div");
  layer.className = "layer";
  layer.tabIndex = -1;
  layer.setAttribute("role", "dialog");
  layer.setAttribute(
    "aria-label",
    "TextTap region selection. Drag to select. Escape cancels.",
  );
  const help = document.createElement("div");
  help.className = "help";
  help.textContent = "Drag over the text you want";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel · Esc";
  help.append(cancel);
  const box = document.createElement("div");
  box.className = "box";
  const size = document.createElement("span");
  size.className = "size";
  box.append(size);
  layer.append(help, box);
  root.append(layer);
  document.documentElement.append(host);
  layer.focus();
  const width = innerWidth,
    height = innerHeight,
    scrollLeft = scrollX,
    scrollTop = scrollY;
  let start = null,
    rect = null,
    finishing = false;
  function cleanup() {
    host.remove();
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("wheel", prevent, true);
    window.removeEventListener("resize", cleanup);
    window.removeEventListener("scroll", cleanup);
    delete globalThis[key];
    if (previousFocus instanceof HTMLElement)
      previousFocus.focus({ preventScroll: true });
  }
  globalThis[key] = cleanup;
  function prevent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function onKey(event) {
    if (event.key === "Escape") {
      prevent(event);
      cleanup();
    } else if (
      [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      prevent(event);
  }
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("wheel", prevent, { passive: false, capture: true });
  window.addEventListener("resize", cleanup);
  window.addEventListener("scroll", cleanup);
  cancel.addEventListener("pointerdown", (event) => event.stopPropagation());
  cancel.addEventListener("click", cleanup);
  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || finishing) return;
    prevent(event);
    start = { x: event.clientX, y: event.clientY };
    layer.setPointerCapture(event.pointerId);
    help.style.display = "none";
  });
  layer.addEventListener("pointermove", (event) => {
    if (!start || finishing) return;
    const x = Math.max(0, Math.min(width, event.clientX)),
      y = Math.max(0, Math.min(height, event.clientY));
    rect = {
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
      viewportWidth: width,
      viewportHeight: height,
    };
    box.style.cssText = `display:block;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px`;
    size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  });
  layer.addEventListener("pointercancel", cleanup);
  layer.addEventListener("pointerup", async () => {
    if (finishing || !start) return;
    start = null;
    if (!rect || rect.width < 5 || rect.height < 5) {
      help.style.display = "block";
      box.style.display = "none";
      return;
    }
    finishing = true;
    host.style.setProperty("visibility", "hidden", "important");
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    try {
      if (
        innerWidth !== width ||
        innerHeight !== height ||
        scrollX !== scrollLeft ||
        scrollY !== scrollTop
      )
        throw new Error("The page moved. Please capture again.");
      const result = await chrome.runtime.sendMessage({
        type: "CAPTURE_REGION",
        region: rect,
      });
      if (!result?.ok) throw new Error(result?.error || "Capture failed.");
      cleanup();
    } catch (error) {
      host.style.setProperty("visibility", "visible", "important");
      box.style.display = "none";
      help.style.display = "block";
      help.firstChild.textContent = `${error.message} `;
      finishing = false;
    }
  });
})();
