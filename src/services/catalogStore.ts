import { create } from "zustand";
import { PlatformId } from "@/lib/types";
import { Catalog, getCatalog } from "@/lib/catalog";
import { getOptions } from "@/lib/options";

interface CatalogState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  activePlatform: PlatformId | "all";
}

interface CatalogActions {
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setActivePlatform: (platform: PlatformId | "all") => void;
}

interface CatalogStore extends CatalogState {
  actions: CatalogActions;
}

const useCatalogStore = create<CatalogStore>((set) => ({
  catalog: null,
  loading: false,
  error: null,
  selectedIds: [],
  activePlatform: "all",
  actions: {
    async load() {
      set({ loading: true, error: null });
      try {
        const options = await getOptions();
        const catalog = await getCatalog(
          options.catalogUrl,
          options.catalogRefreshMinutes
        );
        set({ catalog, loading: false });
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    async refresh() {
      set({ loading: true, error: null });
      try {
        const options = await getOptions();
        // refreshMinutes = 0 forces a re-fetch
        const catalog = await getCatalog(options.catalogUrl, 0);
        set({ catalog, loading: false });
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    toggleSelect(id) {
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((selected) => selected !== id)
          : [...state.selectedIds, id],
      }));
    },
    clearSelection() {
      set({ selectedIds: [] });
    },
    setActivePlatform(platform) {
      set({ activePlatform: platform });
    },
  },
}));

export const useCatalog = () => useCatalogStore((state) => state.catalog);
export const useCatalogLoading = () => useCatalogStore((state) => state.loading);
export const useCatalogError = () => useCatalogStore((state) => state.error);
export const useCatalogSelectedIds = () =>
  useCatalogStore((state) => state.selectedIds);
export const useCatalogActivePlatform = () =>
  useCatalogStore((state) => state.activePlatform);
export const useCatalogActions = () => useCatalogStore((state) => state.actions);
