import { BlockListEntry } from "@/lib/types";
import { hasAnyCookie } from "../chrome/cookies";
import { createDomBackend } from "./domBackend";
import { createUnavailableApiBackend } from "./unavailableApi";
import {
  BlockingBackend,
  PlatformAdapter,
  ResolvedTarget,
} from "./types";

const HOSTNAMES = ["x.com", "twitter.com", "www.x.com", "www.twitter.com"];

async function checkLogin(): Promise<boolean> {
  return hasAnyCookie("https://x.com", ["auth_token"]);
}

function targetUrl(entry: BlockListEntry): string {
  return `https://x.com/${entry.name}`;
}

function parseEntryLine(line: string): BlockListEntry | undefined {
  const match = line.match(/^xblocklist:id=(\d+);name=([\w]+)/);
  if (!match) {
    return undefined;
  }
  return {
    platform: "x",
    kind: "account",
    id: match[1],
    name: match[2],
    blocked: false,
  };
}

function exportEntryLine(entry: BlockListEntry): string {
  return `xblocklist:id=${entry.id};name=${entry.name}`;
}

async function resolveTarget(url: string): Promise<ResolvedTarget | null> {
  try {
    const parsed = new URL(url);
    if (!HOSTNAMES.includes(parsed.hostname)) {
      return null;
    }
    const match = parsed.pathname.match(/^\/([^/]+)/);
    if (!match || ["home", "explore", "notifications", "messages", "search"].includes(match[1])) {
      return null;
    }
    const name = match[1];

    // Best-effort: X embeds the numeric rest_id in the page's JSON payload.
    const html = await fetch(url).then((response) => response.text());
    const idMatch =
      html.match(/"rest_id":"(\d+)"/) ?? html.match(/"id_str":"(\d+)"/);
    if (!idMatch) {
      return null;
    }

    return { id: idMatch[1], name, kind: "account" };
  } catch {
    return null;
  }
}

// X's block GraphQL uses a rotating queryId; until that is configured the API
// backend fails loudly and the DOM backend is the default.
const apiBackend: BlockingBackend = createUnavailableApiBackend(
  "X",
  "block GraphQL queryId not configured",
  checkLogin
);

const domBackend: BlockingBackend = createDomBackend({ targetUrl, checkLogin });

export const xAdapter: PlatformAdapter = {
  id: "x",
  label: "X / Twitter",
  hosts: [
    "*://x.com/*",
    "*://*.x.com/*",
    "*://twitter.com/*",
    "*://*.twitter.com/*",
  ],
  hostnames: HOSTNAMES,
  cookieDomain: "https://x.com",
  defaultKind: "account",
  parseEntryLine,
  exportEntryLine,
  resolveTarget,
  targetUrl,
  checkLogin,
  backends: { api: apiBackend, dom: domBackend },
  defaultBackend: "dom",
};
