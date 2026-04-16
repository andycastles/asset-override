# Asset Override

A Chrome/Firefox extension that redirects asset requests by swapping URL origins — useful for testing local builds against staging or production pages without changing any application code.

## The problem it solves

When developing or debugging a front-end, you often want a live staging or production page to load assets (JS, CSS, images, fonts) from your local dev server instead. Normally this requires changing application config, deploying a special build, or using a proxy. Asset Override handles it at the browser level — no code changes required.

## Features

- **Origin redirect** — rewrite the scheme, host and port of any matching request to a destination of your choosing (e.g. `https://cdn.example.com` → `http://localhost:3000`)
- **Wildcard URL patterns** — match asset URLs using `*` wildcards (e.g. `https://cdn.example.com/assets/*`)
- **Exception patterns** — exclude specific URL patterns from a redirect rule even when they match the main pattern
- **Groups** — organise rules into named groups; enable or disable each group independently
- **Tab URL scope** — optionally restrict a group so its rules only fire when the active tab's URL matches a given pattern
- **Persistent config** — settings are saved via `chrome.storage.sync` and restored automatically
- **Export / Import** — back up and restore your configuration as a JSON file
- **DevTools panel** — access settings directly from the browser DevTools

## How it works

1. **Rule groups** — you define one or more groups, each with a destination origin and a set of URL pattern rules.
2. **declarativeNetRequest** — the background service worker translates your config into Chrome's `declarativeNetRequest` dynamic rules, which redirect matching sub-resource requests at the network level.
3. **Exception rules** — exception patterns are registered at a higher priority than the redirect rule, so a matching exception causes the request to pass through unmodified.
4. **Scoped rules** — when a Tab URL Pattern is set on a group, the generated rules include an `initiatorDomains` condition so they only apply to requests originating from that page.

## Installation

1. Clone or download this repository.
2. Run `npm install && npm run build` to compile the extension into the `dist/` folder.
3. Open Chrome and go to `chrome://extensions` (or Firefox's `about:debugging`).
4. Enable **Developer mode** (top-right toggle in Chrome).
5. Click **Load unpacked** and select the `dist/` folder.

## Configuration

Open the extension options in one of three ways:

- Click the extension icon in the toolbar and press **Open Settings**
- Right-click the extension icon and choose **Options**
- Open browser DevTools — an **Asset Override** panel is available

### Groups

Each group represents a logical set of redirect rules sharing a common destination.

| Field | Description |
|---|---|
| **Name** | A label for the group |
| **Enabled** | Toggle to activate or suspend the entire group |
| **Tab URL Pattern** | *(Optional)* Only apply rules when the current tab matches this pattern (e.g. `https://staging.example.com/*`) |
| **Default redirect origin destination** | The origin to redirect matched requests to (e.g. `http://localhost:3000`) |

### Redirect rules

Each group can contain multiple redirect rules.

| Field | Description |
|---|---|
| **URL Pattern** | Wildcard pattern matching asset URLs to intercept (e.g. `https://cdn.example.com/assets/*`) |
| **Exceptions** | Sub-patterns that should *not* be redirected even if the main pattern matches |

Changes are auto-saved as you type.

### Export / Import

Use the **Export** button to download your current configuration as `asset-override-settings.json`. Use **Import** to restore a previously exported file.

## License

MIT © 2026 Andy Castles
