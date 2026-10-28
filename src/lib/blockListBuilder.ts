import { BlockList, BlockListEntry, BlockListInfo, PlatformId } from "./types";
import { descriptionLabel, platformLabel, titleLabel } from "./blockList";
import {
  detectPlatformAdapter,
  getPlatformAdapter,
} from "@/services/platforms/registry";
import { getCurrentTab } from "@/services/chrome/tabs";

export function blockListMerge(
  blockLists: BlockList[],
  infos?: BlockListInfo
): BlockList {
  const seen = new Set<string>();
  const entries: BlockListEntry[] = [];

  for (const blockList of blockLists) {
    for (const entry of blockList.entries) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      entries.push(entry);
    }
  }

  const first = blockLists[0];
  return {
    id: "",
    platform: first?.platform ?? "instagram",
    kind: entries[0]?.kind ?? first?.kind ?? "account",
    entries,
    infos:
      infos ??
      first?.infos ?? { title: "", description: "", numEntries: entries.length },
    enabled: true,
    source: { type: "file", importedAt: new Date().toISOString() },
  };
}

export function blockListExport(blockList: BlockList): string {
  const adapter = getPlatformAdapter(blockList.platform);
  const entryLines = blockList.entries.map((entry) =>
    adapter.exportEntryLine(entry)
  );

  return [
    `${platformLabel}${blockList.platform}`,
    `${titleLabel}${blockList.infos.title ?? ""}`,
    `${descriptionLabel}${blockList.infos.description ?? ""}`,
    ...entryLines,
  ].join("\n");
}

export interface ResolvedCurrentTarget {
  platform: PlatformId;
  entry: BlockListEntry;
}

export async function getCurrentTarget(): Promise<ResolvedCurrentTarget | null> {
  const tab = await getCurrentTab();
  if (!tab?.url) {
    return null;
  }

  const adapter = detectPlatformAdapter(tab.url);
  if (!adapter) {
    return null;
  }

  const resolved = await adapter.resolveTarget(tab.url);
  if (!resolved) {
    return null;
  }

  return {
    platform: adapter.id,
    entry: {
      platform: adapter.id,
      kind: resolved.kind,
      id: resolved.id,
      name: resolved.name,
      blocked: false,
    },
  };
}

export async function blockListDownload(
  blockListString: string,
  filename = "blocklist"
) {
  const linkElement = document.createElement("a");
  linkElement.setAttribute(
    "href",
    `data:text/plain;charset=utf-8,${encodeURIComponent(blockListString)}`
  );
  linkElement.setAttribute("download", `${filename}.txt`);
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  return Promise.resolve();
}

export function exportBlockLists(blockLists: BlockList[]) {
  const byPlatform = new Map<PlatformId, BlockList[]>();
  for (const blockList of blockLists) {
    const group = byPlatform.get(blockList.platform) ?? [];
    group.push(blockList);
    byPlatform.set(blockList.platform, group);
  }

  for (const [platform, lists] of byPlatform) {
    blockListDownload(
      blockListExport(blockListMerge(lists)),
      `${platform}-blocklist`
    );
  }
}
