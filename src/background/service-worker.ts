import browser from "webextension-polyfill";
import type { Config } from "../shared/types";
import { getConfig, onConfigChanged } from "../shared/storage";

// Rule IDs are integers; we use a stable mapping derived from group+rule indices.
// Dynamic rules are fully replaced on every config update.

/**
 * Parse an origin string (e.g. "http://localhost:3000") into its components.
 * Returns null if the string is not a valid origin.
 */
function parseOrigin(
  origin: string
): { scheme: string; host: string; port?: string } | null {
  try {
    const url = new URL(
      origin.includes("://") ? origin : `https://${origin}`
    );
    const scheme = url.protocol.replace(":", "");
    const host = url.hostname;
    const port = url.port || undefined;
    return { scheme, host, port };
  } catch {
    return null;
  }
}

/**
 * Convert a user-supplied wildcard URL pattern (using * as wildcard) to the
 * urlFilter format accepted by declarativeNetRequest.
 *
 * declarativeNetRequest urlFilter uses:
 *   ||  = domain anchor
 *   |   = start/end anchor
 *   *   = wildcard (zero or more chars)
 *   ^   = separator (matches /, ?, #, end-of-string, port separator)
 *
 * We keep the user pattern largely as-is since DNR urlFilter already supports
 * * wildcards, but we strip any trailing ** (DNR uses single *).
 */
function toUrlFilter(pattern: string): string {
  // Replace consecutive wildcards with a single one
  return pattern.replace(/\*+/g, "*");
}

/**
 * Extract the hostname from a tab URL pattern such as "https://staging.example.com/*".
 * Returns null if extraction fails.
 */
function extractHostname(pattern: string): string | null {
  try {
    // Replace wildcard segments so URL() can parse it
    const normalised = pattern.replace(/\*/g, "placeholder");
    const url = new URL(normalised);
    return url.hostname.replace("placeholder", "") || null;
  } catch {
    return null;
  }
}

let nextRuleId = 1;

/**
 * Build a flat list of declarativeNetRequest rules from the current config,
 * assigning sequential integer IDs.
 */
function buildRules(
  config: Config
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  nextRuleId = 1;

  for (const group of config.groups) {
    if (!group.enabled) continue;

    const parsed = parseOrigin(group.defaultRedirectOriginDestination);
    if (!parsed) continue;

    const condition: chrome.declarativeNetRequest.RuleCondition = {};

    if (group.tabUrlPattern) {
      const hostname = extractHostname(group.tabUrlPattern);
      if (hostname) {
        condition.initiatorDomains = [hostname];
      }
    }

    for (const rule of group.rules) {
      if (rule.type !== "redirect_origin") continue;
      if (!rule.urlPattern.trim()) continue;

      const transform: chrome.declarativeNetRequest.URLTransform = {
        scheme: parsed.scheme,
        host: parsed.host,
      };
      if (parsed.port) {
        transform.port = parsed.port;
      }

      const resourceTypes = [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "other",
      ] as chrome.declarativeNetRequest.ResourceType[];

      // Exception rules (priority 2) must be added before the redirect rule so
      // that if a URL matches an exception pattern the allow action wins.
      for (const exceptionPattern of rule.exceptions ?? []) {
        if (!exceptionPattern.trim()) continue;
        rules.push({
          id: nextRuleId++,
          priority: 2,
          action: {
            type: "allow" as chrome.declarativeNetRequest.RuleActionType,
          },
          condition: {
            ...condition,
            urlFilter: toUrlFilter(exceptionPattern),
            resourceTypes,
          },
        });
      }

      rules.push({
        id: nextRuleId++,
        priority: 1,
        action: {
          type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
          redirect: { transform },
        },
        condition: {
          ...condition,
          urlFilter: toUrlFilter(rule.urlPattern),
          resourceTypes,
        },
      });
    }
  }

  return rules;
}

async function applyConfig(config: Config): Promise<void> {
  const newRules = buildRules(config);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: newRules,
  });

  console.log(
    `[Asset Override] Applied ${newRules.length} rule(s) (removed ${removeIds.length})`
  );
}

// Apply config on service worker startup
getConfig().then(applyConfig).catch(console.error);

// Re-apply whenever config changes
onConfigChanged((newConfig) => {
  applyConfig(newConfig).catch(console.error);
});

// Keep the service worker alive by handling the install event
browser.runtime.onInstalled.addListener(() => {
  console.log("[Asset Override] Extension installed/updated");
  getConfig().then(applyConfig).catch(console.error);
});
