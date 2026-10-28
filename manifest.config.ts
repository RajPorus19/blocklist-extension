import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";
const { version, name, author, contributors, homepage, title, description } =
  packageJson;

const [major, minor, patch, label = "0"] = version
  .replace(/[^\d.-]+/g, "")
  .split(/[.-]/);

// Union of all supported platforms + catalog host + manual-import hosts.
// Keep in sync with `src/services/platforms/*`.
const hostPermissions = [
  // Instagram
  "*://*.instagram.com/*",
  // X / Twitter
  "*://x.com/*",
  "*://*.x.com/*",
  "*://twitter.com/*",
  "*://*.twitter.com/*",
  // TikTok
  "*://*.tiktok.com/*",
  // Facebook
  "*://*.facebook.com/*",
  // YouTube
  "*://*.youtube.com/*",
  // Catalog (provisional domain)
  "*://blocklist.lol/*",
  "*://*.blocklist.lol/*",
  // Manual URL import
  "*://raw.githubusercontent.com/*",
  "*://gist.githubusercontent.com/*",
];

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name: `${env.command === "serve" ? "[Dev] " : ""}${name}`,
  author: `${author.name} & ${contributors.map((c) => c.name).join(", ")}`,
  homepage_url: homepage,
  description,
  version: `${major}.${minor}.${patch}.${label}`,
  version_name: version,
  icons: {
    "128": "icon.png",
  },
  permissions: [
    "cookies",
    "storage",
    "unlimitedStorage",
    "tabs",
    "activeTab",
    "scripting",
    "alarms",
  ],
  host_permissions: hostPermissions,
  action: {
    default_title: title,
    default_popup: "src/Popup/popup.html",
  },
  background: {
    service_worker: "src/Background/background.ts",
    type: "module",
  },
  options_ui: {
    page: "src/Options/options.html",
    open_in_tab: true,
  },
}));
