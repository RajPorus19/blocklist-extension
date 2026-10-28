import { BlockListEntry } from "@/lib/types";
import { delay, errorMessage } from "@/utils/async";
import { BlockingBackend } from "./types";

interface DomBackendConfig {
  targetUrl(entry: BlockListEntry): string;
  checkLogin(): Promise<boolean>;
}

/**
 * Self-contained function injected into the target page via `chrome.scripting`.
 *
 * Best-effort, generic control clicking: opens a "more" menu when present,
 * then clicks a block/unblock control and confirms any dialog. It matches by
 * text/aria-label, not hard-coded selectors, so it works across platforms but
 * may need per-platform refinement (see each adapter's notes).
 *
 * It must stay fully self-contained — no closure over module scope — because
 * `chrome.scripting.executeScript` stringifies the function body.
 */
function domPerformAction(action: "block" | "unblock") {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function findClickable(texts: string[]): HTMLElement | undefined {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [role="button"], [role="menuitem"], a'
      )
    );
    return candidates.find((el) => {
      const label = `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`;
      return texts.some((token) =>
        label.toLowerCase().includes(token.toLowerCase())
      );
    });
  }

  return (async () => {
    const more = findClickable(["more options", "more", "share", "settings"]);
    if (more) {
      more.click();
      await wait(600);
    }

    const labels =
      action === "block"
        ? ["block", "bloquer"]
        : ["unblock", "débloquer", "deblock"];
    const item = findClickable(labels);
    if (!item) {
      return { ok: false, detail: `no ${action} control found` };
    }
    item.click();
    await wait(400);

    const confirm = findClickable(["confirm", "block", "unblock", "bloquer"]);
    if (confirm && confirm !== item) {
      confirm.click();
      await wait(300);
    }

    return { ok: true, detail: `${action} clicked` };
  })();
}

async function ensurePlatformTab(url: string): Promise<number> {
  const origin = new URL(url).origin;
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(
    (tab) => tab.url && new URL(tab.url).origin === origin
  );
  if (existing?.id != null) {
    return existing.id;
  }
  const tab = await chrome.tabs.create({ url, active: false });
  if (tab.id == null) {
    throw new Error("Failed to create tab");
  }
  return tab.id;
}

async function waitForTabLoad(tabId: number): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") {
      return;
    }
    await delay(250);
  }
  throw new Error("Tab load timed out");
}

export function createDomBackend(config: DomBackendConfig): BlockingBackend {
  return {
    id: "dom",
    async checkConnection() {
      return config.checkLogin();
    },
    async block(entries, action, options) {
      const results = [];
      for (const entry of entries) {
        try {
          const url = config.targetUrl(entry);
          const tabId = await ensurePlatformTab(url);
          await chrome.tabs.update(tabId, { url });
          await waitForTabLoad(tabId);

          const injected = await chrome.scripting.executeScript({
            target: { tabId },
            func: domPerformAction as unknown as (
              blockAction: "block" | "unblock"
            ) => { ok: boolean; detail?: string },
            args: [action],
          });

          const outcome = injected[0]?.result;
          results.push({
            entryId: entry.id,
            ok: Boolean(outcome?.ok),
            error: outcome?.ok ? undefined : outcome?.detail ?? "no result",
          });
        } catch (error) {
          results.push({
            entryId: entry.id,
            ok: false,
            error: errorMessage(error),
          });
        }

        if (entries.length > 1) {
          await delay(options.delayMs);
        }
      }
      return results;
    },
  };
}
