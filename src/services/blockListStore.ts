import { create } from "zustand";
import { BlockList } from "@/lib/types";
import { MessageType, sendMessage } from "./chrome/messaging";

interface BlockListState {
  blockLists: BlockList[];
}

interface BlockListActions {
  getBlockLists: () => Promise<void>;
  addBlockLists: (blockList: BlockList[]) => Promise<void>;
  removeBlockLists: (blockListsIDs: string[]) => Promise<void>;
  updateBlockLists: (blockListsIDs: string[], blockLists: BlockList[]) => void;
  checkBlocklistsUpdate: (blockListsIDs: string[]) => Promise<void>;
  setBlockListEnabled: (blockListId: string, enabled: boolean) => Promise<void>;
}

interface BlockListStore extends BlockListState {
  actions: BlockListActions;
}

const useBlockListStore = create<BlockListStore>((set) => ({
  blockLists: [],
  actions: {
    async getBlockLists() {
      const res = await sendMessage({
        type: MessageType.GET_BLOCKLISTS,
        payload: null,
      });

      set(() => ({
        blockLists: res,
      }));
    },
    async addBlockLists(blockLists) {
      const res = await sendMessage({
        type: MessageType.ADD_BLOCKLISTS,
        payload: blockLists,
      });

      set(() => ({
        blockLists: res,
      }));
    },
    async removeBlockLists(blockListsIDs) {
      const res = await sendMessage({
        type: MessageType.REMOVE_BLOCKLISTS,
        payload: blockListsIDs,
      });

      set(() => ({
        blockLists: res,
      }));
    },
    updateBlockLists(blockListsIDs, blockLists) {
      set((state) => {
        const updatedBlockLists = [...state.blockLists];

        blockListsIDs.forEach((id, index) => {
          const blockListIndex = updatedBlockLists.findIndex(
            (blockList) => blockList.id === id
          );

          if (blockListIndex === -1) {
            return;
          }

          updatedBlockLists[blockListIndex] = blockLists[index];
        });

        return {
          blockLists: updatedBlockLists,
        };
      });
    },
    async checkBlocklistsUpdate(blockListsIDs) {
      const res = await sendMessage({
        type: MessageType.CHECK_BLOCKLISTS_UPDATE,
        payload: blockListsIDs,
      });

      set(() => ({
        blockLists: res,
      }));
    },
    async setBlockListEnabled(blockListId, enabled) {
      const res = await sendMessage({
        type: MessageType.SET_BLOCKLIST_ENABLED,
        payload: [blockListId, enabled],
      });

      set(() => ({
        blockLists: res,
      }));
    },
  },
}));

export const useBlockLists = () =>
  useBlockListStore((state) => state.blockLists);

export const useBlockListActions = () =>
  useBlockListStore((state) => state.actions);
