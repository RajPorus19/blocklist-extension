import { BlockListEntry, TargetKind } from "@/lib/types";
import { hasAnyCookie } from "../chrome/cookies";
import { createDomBackend } from "./domBackend";
import { createUnavailableApiBackend } from "./unavailableApi";
import {
  BlockingBackend,
  PlatformAdapter,
  ResolvedTarget,
} from "./types";

const HOSTNAMES = ["www.youtube.com", "youtube.com", "m.youtube.com"];

async function checkLogin(): Promise<boolean> {
  return hasAnyCookie("https://www.youtube.com", ["LOGIN_INFO", "SAPISID"]);
}

function targetUrl(entry: BlockListEntry): string {
  if (entry.kind === "video") {
    return `https://www.youtube.com/watch?v=${entry.id}`;
  }
  if (entry.id.startsWith("UC")) {
    return `https://www.youtube.com/channel/${entry.id}`;
  }
  return `https://www.youtube.com/@${entry.name}`;
}

function parseEntryLine(line: string): BlockListEntry | undefined {
  const match = line.match(
    /^youtubeblocklist:kind=(channel|video);id=([\w-]+);name=(.+)$/
  );
  if (!match) {
    return undefined;
  }
  return {
    platform: "youtube",
    kind: match[1] as TargetKind,
    id: match[2],
    name: match[3],
    blocked: false,
  };
}

function exportEntryLine(entry: BlockListEntry): string {
  return `youtubeblocklist:kind=${entry.kind};id=${entry.id};name=${entry.name}`;
}

async function resolveTarget(url: string): Promise<ResolvedTarget | null> {
  try {
    const parsed = new URL(url);
    if (!HOSTNAMES.includes(parsed.hostname)) {
      return null;
    }

    // Video: /watch?v=VIDEO_ID
    if (parsed.pathname === "/watch") {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        const html = await fetch(url).then((response) => response.text());
        const title = html.match(/<title>([^<]*)<\/title>/);
        const name = title
          ? title[1].replace(/ - YouTube$/, "")
          : videoId;
        return { id: videoId, name, kind: "video" };
      }
    }

    // Channel by id: /channel/UC...
    const channel = parsed.pathname.match(/^\/channel\/(UC[\w-]+)/);
    if (channel) {
      return { id: channel[1], name: channel[1], kind: "channel" };
    }

    // Channel by handle: /@handle
    const handle = parsed.pathname.match(/^\/@([^/]+)/);
    if (handle) {
      const html = await fetch(url).then((response) => response.text());
      const idMatch =
        html.match(/"channelId":"(UC[\w-]+)"/) ??
        html.match(/channel_id=([\w-]+)/);
      if (!idMatch) {
        return null;
      }
      return { id: idMatch[1], name: handle[1], kind: "channel" };
    }

    return null;
  } catch {
    return null;
  }
}

// YouTube's Innertube API requires an API key plus per-item feedback tokens for
// "don't recommend" actions; the DOM backend is the realistic path.
const apiBackend: BlockingBackend = createUnavailableApiBackend(
  "YouTube",
  "Innertube feedback tokens not reverse-engineered",
  checkLogin
);

const domBackend: BlockingBackend = createDomBackend({ targetUrl, checkLogin });

export const youtubeAdapter: PlatformAdapter = {
  id: "youtube",
  label: "YouTube",
  hosts: ["*://*.youtube.com/*"],
  hostnames: HOSTNAMES,
  cookieDomain: "https://www.youtube.com",
  defaultKind: "channel",
  parseEntryLine,
  exportEntryLine,
  resolveTarget,
  targetUrl,
  checkLogin,
  backends: { api: apiBackend, dom: domBackend },
  defaultBackend: "dom",
};
