import browser from "webextension-polyfill";
import { getConfig } from "../shared/storage";

async function init(): Promise<void> {
  const config = await getConfig();
  const total = config.groups.length;
  const enabled = config.groups.filter((g) => g.enabled).length;

  const statusText = document.getElementById("status-text");
  if (statusText) {
    if (total === 0) {
      statusText.textContent = "No groups configured.";
    } else {
      statusText.textContent = `${total} group${total !== 1 ? "s" : ""}, ${enabled} enabled.`;
    }
  }

  document.getElementById("btn-open-settings")?.addEventListener("click", () => {
    browser.runtime.openOptionsPage().catch(console.error);
  });
}

init().catch(console.error);
