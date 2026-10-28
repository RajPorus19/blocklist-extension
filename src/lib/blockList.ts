import { v4 as uuidv4 } from "uuid";
import { BlockList, BlockListSource, PlatformId } from "./types";
import { timer, warnLog, errorLog, infoLog } from "@/utils/log";
import { getPlatformAdapter } from "@/services/platforms/registry";
import {
  BackendId,
  BlockAction,
  BlockingBackend,
  BlockingOptions,
  BlockingResult,
} from "@/services/platforms/types";
import { BackendPreference, getPlatformOptions } from "./options";
import { errorMessage } from "@/utils/async";
import * as chromStorage from "@/services/chrome/storage";

export const titleLabel = "title:";
export const descriptionLabel = "description:";
export const platformLabel = "platform:";

function detectPlatformId(fileText: string): PlatformId {
  const header = fileText
    .split(/\r?\n/)
    .find((line) => line.startsWith(platformLabel));
  if (!header) {
    return "instagram";
  }
  return header.slice(platformLabel.length).trim() as PlatformId;
}

export function toBlockList(
  sourceType: BlockListSource["type"],
  ...files: [url: string | undefined, contents: string][]
): BlockList[] {
  const stopTimer = timer("Parse block list");
  try {
    const blockLists: BlockList[] = [];

    for (const [url, fileText] of files) {
      const platformId = detectPlatformId(fileText);
      const adapter = getPlatformAdapter(platformId);

      const blockList: BlockList = {
        id: uuidv4(),
        platform: adapter.id,
        kind: adapter.defaultKind,
        entries: [],
        infos: {
          url,
          title: undefined,
          description: undefined,
          numEntries: 0,
        },
        enabled: true,
        source: { type: sourceType, importedAt: new Date().toISOString() },
      };

      const seen = new Set<string>();
      let dupes = 0;

      for (const line of fileText.split(/\r?\n/)) {
        if (!blockList.infos.title && line.startsWith(titleLabel)) {
          blockList.infos.title = line.slice(titleLabel.length);
        } else if (
          !blockList.infos.description &&
          line.startsWith(descriptionLabel)
        ) {
          blockList.infos.description = line.slice(descriptionLabel.length);
        } else {
          const entry = adapter.parseEntryLine(line);
          if (entry) {
            if (!seen.has(entry.id)) {
              seen.add(entry.id);
              blockList.entries.push(entry);
              blockList.infos.numEntries++;
            } else {
              dupes++;
            }
          }
        }
      }

      blockList.kind = blockList.entries[0]?.kind ?? adapter.defaultKind;

      if (dupes > 0) {
        warnLog(
          "blockListFile",
          `Discarded ${dupes} duplicate entries from block list`
        );
      }

      blockLists.push(blockList);
    }

    return blockLists;
  } finally {
    stopTimer();
  }
}

export function validateBlockLists(blockLists: BlockList[]): BlockList[] {
  return blockLists.filter((blockList) => blockList.entries.length > 0);
}

function backendOrder(
  adapter: { defaultBackend: BackendId },
  preference: BackendPreference
): BackendId[] {
  if (preference !== "auto") {
    return [preference];
  }
  const others: BackendId[] = (["api", "dom"] as BackendId[]).filter(
    (backend) => backend !== adapter.defaultBackend
  );
  return [adapter.defaultBackend, ...others];
}

async function runWithFallback(
  adapter: {
    label: string;
    defaultBackend: BackendId;
    backends: Partial<Record<BackendId, BlockingBackend>>;
  },
  preference: BackendPreference,
  targets: BlockList["entries"],
  action: BlockAction,
  options: BlockingOptions
): Promise<BlockingResult[]> {
  for (const backendId of backendOrder(adapter, preference)) {
    const backend = adapter.backends[backendId];
    if (!backend) {
      continue;
    }
    try {
      if (!(await backend.checkConnection())) {
        infoLog(
          "blockList",
          `backend ${backendId} not connected for ${adapter.label}`
        );
        continue;
      }
      return await backend.block(targets, action, options);
    } catch (error) {
      infoLog(
        "blockList",
        `backend ${backendId} failed for ${adapter.label}, trying next`,
        errorMessage(error)
      );
    }
  }
  return targets.map((target) => ({
    entryId: target.id,
    ok: false,
    error: `No working backend for ${adapter.label}`,
  }));
}

export async function toggleBlockLists(
  blockLists: BlockList[],
  enable: boolean,
  onProgress: (
    blockListId: string,
    entryIndex: number,
    result: BlockingResult
  ) => Promise<void> | void
): Promise<void> {
  try {
    for (const blockList of blockLists) {
      if (enable && !blockList.enabled) {
        continue;
      }

      const adapter = getPlatformAdapter(blockList.platform);
      const platformOptions = await getPlatformOptions(blockList.platform);
      const targets = blockList.entries.filter(
        (entry) => entry.blocked !== enable
      );
      if (!targets.length) {
        continue;
      }

      const results = await runWithFallback(
        adapter,
        platformOptions.backend,
        targets,
        enable ? "block" : "unblock",
        {
          delayMs: platformOptions.delayBetweenRequests,
          batchSize: platformOptions.batchSize,
        }
      );

      const indexById = new Map<string, number>();
      blockList.entries.forEach((entry, index) => indexById.set(entry.id, index));

      for (const result of results) {
        const index = indexById.get(result.entryId);
        if (index === undefined) {
          continue;
        }
        await onProgress(blockList.id, index, result);
      }
    }
  } catch (error) {
    errorLog("blockList", `Failed to toggle blocklists to ${enable}`, error);
  }
}

export async function getBlockLists(): Promise<BlockList[]> {
  const blockLists = await chromStorage.getItem<BlockList[]>("blockLists");
  return blockLists || [];
}

export async function setBlockLists(blockLists: BlockList[]) {
  await chromStorage.setItem("blockLists", blockLists);
}

export async function initializeBlockLists() {
  const blockLists = await getBlockLists();
  if (!blockLists.length) {
    await setBlockLists([]);
  }
}
