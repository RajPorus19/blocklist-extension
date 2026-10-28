import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  BlockListEntry,
  BlockListInfo,
  PlatformId,
  TargetKind,
} from "@/lib/types";
import * as chromeStorage from "./chrome/storage";

interface BlockListBuilderState {
  platform: PlatformId;
  kind: TargetKind;
  entries: BlockListEntry[];
  infos: BlockListInfo;
}

interface BlockListBuilderActions {
  setPlatform: (platform: PlatformId) => void;
  addEntry: (entry: BlockListEntry) => void;
  removeEntry: (entryID: string) => void;
  removeAllEntries: () => void;
  setInfo: (info: Partial<BlockListInfo>) => void;
}

interface BlockListBuilderStore extends BlockListBuilderState {
  actions: BlockListBuilderActions;
}

const useBlockListBuilderStore = create<BlockListBuilderStore>()(
  persist(
    (set) => ({
      platform: "instagram" as PlatformId,
      kind: "account" as TargetKind,
      entries: [],
      infos: { title: "", description: "", numEntries: 0 },
      actions: {
        setPlatform: (platform) =>
          set((state) => ({
            platform,
            kind: platform === "youtube" ? "channel" : "account",
            entries: [],
            infos: { ...state.infos, numEntries: 0 },
          })),
        addEntry: (entry) =>
          set((state) => ({
            platform: entry.platform,
            kind: entry.kind,
            entries: [...state.entries, entry],
            infos: { ...state.infos, numEntries: state.infos.numEntries + 1 },
          })),
        removeEntry: (entryID) =>
          set((state) => {
            const entryIndex = state.entries.findIndex(
              (entry) => entry.id === entryID
            );
            if (entryIndex !== -1) {
              const entries = [...state.entries];
              entries.splice(entryIndex, 1);
              return {
                entries,
                infos: { ...state.infos, numEntries: state.infos.numEntries - 1 },
              };
            }
            return state;
          }),
        removeAllEntries: () =>
          set((state) => ({
            entries: [],
            infos: { ...state.infos, numEntries: 0 },
          })),
        setInfo: (infos) =>
          set((state) => ({ infos: { ...state.infos, ...infos } })),
      },
    }),
    {
      name: "blockListBuilder",
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        platform: state.platform,
        kind: state.kind,
        entries: state.entries,
        infos: state.infos,
      }),
    }
  )
);

export const useBlockListBuilderPlatform = () =>
  useBlockListBuilderStore((state) => state.platform);

export const useBlockListBuilderKind = () =>
  useBlockListBuilderStore((state) => state.kind);

export const useBlockListBuilderEntries = () =>
  useBlockListBuilderStore((state) => state.entries);

export const useBlockListBuilderInfos = () =>
  useBlockListBuilderStore((state) => state.infos);

export const useBlockListBuilderActions = () =>
  useBlockListBuilderStore((state) => state.actions);
