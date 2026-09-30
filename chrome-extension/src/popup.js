const status = document.getElementById("popup-status");
for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", async () => {
    for (const control of document.querySelectorAll("button"))
      control.disabled = true;
    status.textContent = "Preparing…";
    try {
      const result = await chrome.runtime.sendMessage({
        type: button.dataset.action,
      });
      if (!result?.ok)
        throw new Error(result?.error || "Could not start TextTap.");
      window.close();
    } catch (error) {
      status.textContent = error.message;
      for (const control of document.querySelectorAll("button"))
        control.disabled = false;
    }
  });
}
