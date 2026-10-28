import dayjs from "dayjs";
import { BlockListEntry } from "@/lib/types";
import { chunk, delay, errorMessage } from "@/utils/async";
import { getAllCookies } from "../chrome/cookies";
import {
  BlockingBackend,
  PlatformAdapter,
  ResolvedTarget,
} from "./types";

const GRAPH_QL_API = {
  block: {
    DOC_ID: "7889888917690727",
    FB_API_REQ_FRIENDLY_NAME: "usePolarisBlockManyMutation",
  },
  unblock: {
    DOC_ID: "7171453892977632",
    FB_API_REQ_FRIENDLY_NAME: "usePolarisUnblockManyMutation",
  },
};

function queryString(params: Record<string, string | object>) {
  return Object.keys(params)
    .map((key) => {
      if (typeof params[key] === "object") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(
          JSON.stringify(params[key])
        )}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        params[key] as string
      )}`;
    })
    .join("&");
}

async function getInstagramCookies() {
  const cookies = await getAllCookies("https://www.instagram.com");

  const sessionIDCookie = cookies.find(
    (cookie) => cookie.name === "sessionid"
  );

  if (!sessionIDCookie) {
    throw new Error("No sessionid found");
  }

  if (sessionIDCookie.expirationDate) {
    const expirationDate = dayjs(sessionIDCookie.expirationDate * 1000);
    if (expirationDate.isBefore(dayjs())) {
      throw new Error("Session expired");
    }
  }

  return cookies;
}

async function blockMany(userIds: string[], action: "block" | "unblock") {
  const cookies = await getInstagramCookies();

  const csrftoken = cookies.find(
    (cookie) => cookie.name === "csrftoken"
  )?.value;

  if (!csrftoken) {
    throw new Error("No csrftoken found");
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRFToken": csrftoken,
    Cookie: cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
  };

  const body = {
    fb_api_req_friendly_name: GRAPH_QL_API[action].FB_API_REQ_FRIENDLY_NAME,
    doc_id: GRAPH_QL_API[action].DOC_ID,
    variables: {
      target_user_ids: userIds,
    },
  };

  const raw = queryString(body);

  const response = await fetch("https://www.instagram.com/graphql/query/", {
    method: "POST",
    headers,
    body: raw,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Instagram GraphQL request failed -- ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  let json: { errors?: { message?: string }[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "Instagram GraphQL returned a non-JSON response (likely a login or challenge page)."
    );
  }

  if (json.errors?.length) {
    throw new Error(
      `Instagram GraphQL error: ${json.errors
        .map((error) => error.message)
        .join(", ")}`
    );
  }
}

const apiBackend: BlockingBackend = {
  id: "api",
  async checkConnection() {
    try {
      await getInstagramCookies();
      return true;
    } catch {
      return false;
    }
  },
  async block(entries, action, options) {
    const results = [];
    const groups = chunk(entries, Math.max(1, options.batchSize));

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        await blockMany(
          group.map((entry) => entry.id),
          action
        );
        for (const entry of group) {
          results.push({ entryId: entry.id, ok: true });
        }
      } catch (error) {
        for (const entry of group) {
          results.push({
            entryId: entry.id,
            ok: false,
            error: errorMessage(error),
          });
        }
      }

      if (i < groups.length - 1) {
        await delay(options.delayMs);
      }
    }

    return results;
  },
};

const domBackend: BlockingBackend = {
  id: "dom",
  async checkConnection() {
    try {
      await getInstagramCookies();
      return true;
    } catch {
      return false;
    }
  },
  // Implemented by the shared DOM backend framework (content script) in a
  // later phase; the Instagram reference backend is `api`.
  async block(entries) {
    return entries.map((entry) => ({
      entryId: entry.id,
      ok: false,
      error: "Instagram DOM backend not implemented yet.",
    }));
  },
};

function parseEntryLine(line: string): BlockListEntry | undefined {
  const match = line.match(/^instagramblocklist:id=(\d+);name=([\w.-]+)/);
  if (!match) {
    return undefined;
  }
  return {
    platform: "instagram",
    kind: "account",
    id: match[1],
    name: match[2],
    blocked: false,
  };
}

function exportEntryLine(entry: BlockListEntry): string {
  return `instagramblocklist:id=${entry.id};name=${entry.name}`;
}

async function resolveTarget(url: string): Promise<ResolvedTarget | null> {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.instagram.com") {
      return null;
    }

    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    if (
      !segment ||
      ["reel", "reels", "p", "explore", "stories"].includes(segment)
    ) {
      return null;
    }

    const html = await fetch(url).then((response) => response.text());
    const userId = html.match(/target_id":"(.*?)"/);
    if (!userId) {
      return null;
    }

    return { id: userId[1], name: segment, kind: "account" };
  } catch {
    return null;
  }
}

export const instagramAdapter: PlatformAdapter = {
  id: "instagram",
  label: "Instagram",
  hosts: ["*://*.instagram.com/*"],
  hostnames: ["www.instagram.com", "instagram.com"],
  cookieDomain: "https://www.instagram.com",
  defaultKind: "account",
  parseEntryLine,
  exportEntryLine,
  resolveTarget,
  backends: { api: apiBackend, dom: domBackend },
  defaultBackend: "api",
};
