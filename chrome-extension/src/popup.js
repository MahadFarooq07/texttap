const status = document.getElementById("popup-status");
void chrome.runtime
  .sendMessage({ type: "GET_STATUS" })
  .then((result) => {
    if (result?.ok) status.textContent = result.message;
  })
  .catch(() => {});
for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", async () => {
    for (const control of document.querySelectorAll("button"))
      control.disabled = true;
    status.textContent =
      button.dataset.action === "CAPTURE_VISIBLE"
        ? "Reading locally… Text will be copied automatically."
        : "Preparing…";
    try {
      const result = await chrome.runtime.sendMessage({
        type: button.dataset.action,
      });
      if (!result?.ok)
        throw new Error(result?.error || "Could not start TextTap.");
      if (result.copied) {
        status.textContent = "Copied. Press Ctrl+V (⌘V on Mac) to paste.";
        for (const control of document.querySelectorAll("button"))
          control.disabled = false;
      } else window.close();
    } catch (error) {
      status.textContent = error.message;
      for (const control of document.querySelectorAll("button"))
        control.disabled = false;
    }
  });
}
