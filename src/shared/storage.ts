import browser from "webextension-polyfill";
import type { Config } from "./types";
import { EMPTY_CONFIG } from "./types";

const STORAGE_KEY = "config";

export async function getConfig(): Promise<Config> {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Config) ?? EMPTY_CONFIG;
}

export async function setConfig(config: Config): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: config });
}

export function onConfigChanged(
  listener: (newConfig: Config) => void
): () => void {
  const handler = (
    changes: Record<string, browser.Storage.StorageChange>
  ): void => {
    if (STORAGE_KEY in changes) {
      listener((changes[STORAGE_KEY].newValue as Config) ?? EMPTY_CONFIG);
    }
  };
  browser.storage.sync.onChanged.addListener(handler);
  return () => browser.storage.sync.onChanged.removeListener(handler);
}
