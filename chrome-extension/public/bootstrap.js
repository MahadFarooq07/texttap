// Surface module-loading failures instead of leaving an apparently inert editor.
document.documentElement.dataset.texttapBootstrap = "ready";
window.addEventListener("error", (event) => {
  const notice = document.getElementById("notice");
  notice.hidden = false;
  notice.textContent = `TextTap encountered an error: ${event.message || "A required file failed to load"}. Reload the extension and try again.`;
});
