import { BlockListEntry } from "@/lib/types";
import { hasAnyCookie } from "../chrome/cookies";
import { createDomBackend } from "./domBackend";
import { createUnavailableApiBackend } from "./unavailableApi";
import {
  BlockingBackend,
  PlatformAdapter,
  ResolvedTarget,
} from "./types";

const HOSTNAMES = ["www.facebook.com", "facebook.com"];

async function checkLogin(): Promise<boolean> {
  return hasAnyCookie("https://www.facebook.com", ["c_user", "xs"]);
}

function targetUrl(entry: BlockListEntry): string {
  return `https://www.facebook.com/${entry.name}`;
}

function parseEntryLine(line: string): BlockListEntry | undefined {
  const match = line.match(/^facebookblocklist:id=(\d+);name=(.+)$/);
  if (!match) {
    return undefined;
  }
  return {
    platform: "facebook",
    kind: "account",
    id: match[1],
    name: match[2],
    blocked: false,
  };
}

function exportEntryLine(entry: BlockListEntry): string {
  return `facebookblocklist:id=${entry.id};name=${entry.name}`;
}

async function resolveTarget(url: string): Promise<ResolvedTarget | null> {
  try {
    const parsed = new URL(url);
    if (!HOSTNAMES.includes(parsed.hostname)) {
      return null;
    }

    // /profile.php?id=123
    if (parsed.pathname === "/profile.php") {
      const id = parsed.searchParams.get("id");
      if (id) {
        return { id, name: id, kind: "account" };
      }
    }

    // /people/Name/123456789
    const people = parsed.pathname.match(/^\/people\/[^/]+\/(\d+)/);
    if (people) {
      return { id: people[1], name: people[1], kind: "account" };
    }

    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    if (!segment || ["watch", "groups", "marketplace", "reel"].includes(segment)) {
      return null;
    }

    // Best-effort: extract the numeric userID from the profile page markup.
    const html = await fetch(url).then((response) => response.text());
    const idMatch =
      html.match(/"userID":"(\d+)"/) ?? html.match(/"user_id":"(\d+)"/);
    if (!idMatch) {
      return null;
    }

    return { id: idMatch[1], name: segment, kind: "account" };
  } catch {
    return null;
  }
}

const apiBackend: BlockingBackend = createUnavailableApiBackend(
  "Facebook",
  "block mutation not reverse-engineered",
  checkLogin
);

const domBackend: BlockingBackend = createDomBackend({ targetUrl, checkLogin });

export const facebookAdapter: PlatformAdapter = {
  id: "facebook",
  label: "Facebook",
  hosts: ["*://*.facebook.com/*"],
  hostnames: HOSTNAMES,
  cookieDomain: "https://www.facebook.com",
  defaultKind: "account",
  parseEntryLine,
  exportEntryLine,
  resolveTarget,
  targetUrl,
  checkLogin,
  backends: { api: apiBackend, dom: domBackend },
  defaultBackend: "dom",
};
