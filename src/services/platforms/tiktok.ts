import { BlockListEntry } from "@/lib/types";
import { hasAnyCookie } from "../chrome/cookies";
import { createDomBackend } from "./domBackend";
import { createUnavailableApiBackend } from "./unavailableApi";
import {
  BlockingBackend,
  PlatformAdapter,
  ResolvedTarget,
} from "./types";

const HOSTNAMES = ["www.tiktok.com", "tiktok.com"];

async function checkLogin(): Promise<boolean> {
  return hasAnyCookie("https://www.tiktok.com", ["sessionid", "sessionid_tt"]);
}

function targetUrl(entry: BlockListEntry): string {
  return `https://www.tiktok.com/@${entry.name}`;
}

function parseEntryLine(line: string): BlockListEntry | undefined {
  const match = line.match(/^tiktokblocklist:id=(\d+);name=([\w.]+)/);
  if (!match) {
    return undefined;
  }
  return {
    platform: "tiktok",
    kind: "account",
    id: match[1],
    name: match[2],
    blocked: false,
  };
}

function exportEntryLine(entry: BlockListEntry): string {
  return `tiktokblocklist:id=${entry.id};name=${entry.name}`;
}

async function resolveTarget(url: string): Promise<ResolvedTarget | null> {
  try {
    const parsed = new URL(url);
    if (!HOSTNAMES.includes(parsed.hostname)) {
      return null;
    }
    const match = parsed.pathname.match(/^\/@([^/]+)/);
    if (!match) {
      return null;
    }
    const name = match[1];

    // Best-effort: TikTok embeds the numeric user id in the rehydration JSON.
    // This regex is a starting point and needs live validation.
    const html = await fetch(url).then((response) => response.text());
    const idMatch = html.match(/"id":"(\d{5,})"/);
    if (!idMatch) {
      return null;
    }

    return { id: idMatch[1], name, kind: "account" };
  } catch {
    return null;
  }
}

// TikTok's internal API is signed (X-Bogus / msToken); the DOM backend is the
// realistic path. The API backend is present only to fail loudly and let the
// fallback move to DOM.
const apiBackend: BlockingBackend = createUnavailableApiBackend(
  "TikTok",
  "internal API requires signed requests (X-Bogus/msToken)",
  checkLogin
);

const domBackend: BlockingBackend = createDomBackend({ targetUrl, checkLogin });

export const tiktokAdapter: PlatformAdapter = {
  id: "tiktok",
  label: "TikTok",
  hosts: ["*://*.tiktok.com/*"],
  hostnames: HOSTNAMES,
  cookieDomain: "https://www.tiktok.com",
  defaultKind: "account",
  parseEntryLine,
  exportEntryLine,
  resolveTarget,
  targetUrl,
  checkLogin,
  backends: { api: apiBackend, dom: domBackend },
  defaultBackend: "dom",
};
