import { v4 as uuidv4 } from "uuid";
import { BlockList, BlockListUser } from "./types";
import { timer, warnLog, errorLog, infoLog } from "@/utils/log";
import { toggleBlockUser } from "@/services/instagram";
import * as chromStorage from "@/services/chrome/storage";
import { getOptions } from "./options";

/**
 * The title should follow the following format:
 * title:This Is My Source File Title.
 */
export const titleLabel = "title:";
/**
 * The description should follow the following format:
 * description:This Is My Source File Description And Maybe It Is Longer.
 */
export const descriptionLabel = "description:";
/**
 * The instagram block list should follow the following format:
 * instagramblocklist:id=123456789;name=example
 */
export const instagramblocklistLabel = "instagramblocklist:";
/**
 * The id should follow the following format:
 * id=123456789
 */
export const idLabel = "id=";
/**
 * The name should follow the following format:
 * name=example
 */
export const nameLabel = "name=";
/**
 * Extracts id, names, title, and description from the meat of
 * one or more block list text files, deduplicating within
 * and between lists.
 */
const instagramBlockListRegex = /^instagramblocklist:id=\d+;name=[\w.-]+/;
function toBlockListUser(line: string): BlockListUser | undefined {
  if (instagramBlockListRegex.test(line)) {
    const [id, name] = line.split(";");
    return {
      id: id.slice("instagramblocklist:id=".length),
      name: name.slice("name=".length),
      blocked: false,
    };
  }
  return undefined;
}

export function toBlockList(
  ...files: [url: string | undefined, contents: string][]
): BlockList[] {
  const stopTimer = timer("Parse block list");
  try {
    const blockLists: BlockList[] = [];

    for (const [url, fileText] of files) {
      const blockList: BlockList = {
        id: uuidv4(),
        users: [],
        infos: {
          url,
          title: undefined,
          description: undefined,
          numUsers: 0,
        },
      };
      const seen = new Set<string>();
      let dupes = 0;

      const lines = fileText.split(/\r?\n/);

      for (const line of lines) {
        if (!blockList.infos.title && line.startsWith(titleLabel)) {
          blockList.infos.title = line.slice(titleLabel.length);
        } else if (
          !blockList.infos.description &&
          line.startsWith(descriptionLabel)
        ) {
          blockList.infos.description = line.slice(descriptionLabel.length);
        } else {
          const user = toBlockListUser(line);

          if (user) {
            const { id } = user;

            if (!seen.has(id)) {
              seen.add(id);
              blockList.users.push(user);
              blockList.infos.numUsers++;
            } else {
              dupes++;
            }
          }
        }
      }

      if (dupes > 0) {
        warnLog(
          "blocklistFile",
          `Discarded ${dupes} duplicate users from block list`
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
  return blockLists.filter((blockList) => blockList.users.length > 0);
}

export async function toggleBlockLists(
  blockLists: BlockList[],
  enable: boolean,
  onSuccess: (blockListID: string, userIndex: number) => Promise<void> | void
) {
  try {
    for (let i = 0; i < blockLists.length; i++) {
      const blockList = blockLists[i];
      for (let userIndex = 0; userIndex < blockList.users.length; userIndex++) {
        const user = blockList.users[userIndex];
        if (user.blocked === enable) {
          continue;
        }

        await toggleBlockUser(user.id, enable ? "block" : "unblock");

        await onSuccess(blockList.id, userIndex);

        const options = await getOptions();
        await new Promise((resolve) => {
          infoLog(
            "blockList",
            `waiting ${options.delayBetweenRequests}ms before next request`
          );
          return setTimeout(resolve, options.delayBetweenRequests);
        });
      }
    }
  } catch (e) {
    errorLog("blockList", `Failed to toggle blocklists to ${enable}`, e);
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
