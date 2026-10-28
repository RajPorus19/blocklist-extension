import Queue from "queue";
import { infoLog } from "@/utils/log";
import { BlockList } from "@/lib/types";
import {
  getBlockLists,
  initializeBlockLists,
  setBlockLists,
  toggleBlockLists,
} from "@/lib/blockList";
import { migrateBlockListsStorage } from "@/lib/migration";
import { fetchBlockListURLs } from "@/lib/blockListUrl";
import { getOptions, initializeOptions } from "@/lib/options";
import { Message, MessageType, sendMessage } from "@/services/chrome/messaging";
import { BlockingResult } from "@/services/platforms/types";

infoLog("background", "background script is running");

const q = new Queue({ concurrency: 1, autostart: true });

async function start() {
  const { autoUpdate } = await getOptions();
  if (autoUpdate) {
    infoLog("background", "auto updating blocklists");
    onCheckBlockListsUpdate(["*"]);
  }
}

async function isPopupOpen() {
  return (
    (
      await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.POPUP],
      })
    ).length > 0
  );
}

async function onGetBlockLists() {
  infoLog("background", "getting blocklists");
  return await getBlockLists();
}

async function onAddBlockLists(newBlockLists: BlockList[]) {
  infoLog("background", "adding blocklists", newBlockLists);
  const blockLists = await getBlockLists();
  const updatedBlockLists = blockLists.concat(newBlockLists);
  await setBlockLists(updatedBlockLists);
  onToggleBlockLists(
    newBlockLists.map((blockList) => blockList.id),
    true
  );
  return updatedBlockLists;
}

async function onRemoveBlockLists(blockListsIDs: string[]) {
  infoLog("background", "removing blocklists", blockListsIDs);
  const blockLists = await getBlockLists();
  if (!blockLists.length) {
    return blockLists;
  }
  const updatedBlockLists = blockLists.filter(
    (blockList) =>
      !blockListsIDs.includes(blockList.id) && !blockListsIDs.includes("*")
  );
  await setBlockLists(updatedBlockLists);
  return updatedBlockLists;
}

async function onToggleBlockLists(blockListsIDs: string[], enable: boolean) {
  infoLog("background", "toggling blocklist", blockListsIDs);

  q.push(async () => {
    const blockLists = await getBlockLists();
    if (!blockLists.length) {
      return blockLists;
    }
    const blockListsToToggle = blockLists.filter(
      (blockList) =>
        blockListsIDs.includes("*") || blockListsIDs.includes(blockList.id)
    );
    await toggleBlockLists(
      blockListsToToggle,
      enable,
      async (blockListId, entryIndex, result) => {
        await updateEntryState(blockListId, entryIndex, enable, result);
      }
    );
  });
}

async function updateEntryState(
  blockListId: string,
  entryIndex: number,
  enable: boolean,
  result: BlockingResult
) {
  const blockLists = await getBlockLists();
  const updatedBlockLists = [...blockLists];
  const index = updatedBlockLists.findIndex(
    (blockList) => blockList.id === blockListId
  );

  if (index === -1) {
    throw new Error(`Blocklist not found: ${blockListId}`);
  }

  const entry = updatedBlockLists[index].entries[entryIndex];
  if (result.ok) {
    entry.blocked = enable;
    entry.error = undefined;
  } else {
    entry.error = result.error;
  }

  await setBlockLists(updatedBlockLists);
  if (await isPopupOpen()) {
    sendMessage({
      type: MessageType.BLOCKLITS_UPDATED,
      payload: [[blockListId], [updatedBlockLists[index]]],
    });
  }
}

async function onCheckBlockListsUpdate(blockListsIDs: string[]) {
  infoLog("background", "updating blocklists", blockListsIDs);
  const blockLists = await getBlockLists();
  if (!blockLists.length) {
    return blockLists;
  }
  const updatedBlockLists = await Promise.all(
    blockLists.map(async (blockList) => {
      const { id } = blockList;
      const noUp = !blockListsIDs.includes("*") && !blockListsIDs.includes(id);
      if (!blockList.infos.url || noUp) {
        return blockList;
      }
      const [updatedBlockList] = await fetchBlockListURLs(blockList.infos.url);
      updatedBlockList.entries.forEach((entry, index) => {
        const entryIndex = blockList.entries.findIndex(
          (blockListEntry) => blockListEntry.id === entry.id
        );
        if (entryIndex === -1) {
          return;
        }
        updatedBlockList.entries[index].blocked =
          blockList.entries[entryIndex].blocked;
      });
      return {
        ...updatedBlockList,
        id,
        enabled: blockList.enabled,
        source: { ...blockList.source, updatedAt: new Date().toISOString() },
      };
    })
  );

  await setBlockLists(updatedBlockLists);

  onToggleBlockLists(blockListsIDs, true);
  return updatedBlockLists;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  infoLog("background", "received message", sender, message);
  const { type, payload } = message as Message<unknown>;
  (async () => {
    switch (type) {
      case MessageType.GET_BLOCKLISTS:
        sendResponse(await onGetBlockLists());
        break;
      case MessageType.ADD_BLOCKLISTS:
        sendResponse(await onAddBlockLists(payload as BlockList[]));
        break;
      case MessageType.REMOVE_BLOCKLISTS:
        sendResponse(await onRemoveBlockLists(payload as string[]));
        break;
      case MessageType.TOGGLE_BLOCKLISTS:
        onToggleBlockLists(...(payload as [string[], boolean]));
        sendResponse(true);
        break;
      case MessageType.CHECK_BLOCKLISTS_UPDATE:
        sendResponse(await onCheckBlockListsUpdate(payload as string[]));
        break;
      default:
        break;
    }
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  infoLog("background", "extension installed");
  (async () => {
    await migrateBlockListsStorage();
    await initializeBlockLists();
    await initializeOptions();
  })();
});

start();
