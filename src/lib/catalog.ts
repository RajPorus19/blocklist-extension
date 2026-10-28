import { z } from "zod";
import { BlockList } from "./types";
import * as chromStorage from "@/services/chrome/storage";
import { fetchBlockListURLs } from "./blockListUrl";

export const catalogEntrySchema = z.object({
  id: z.string(),
  platform: z.enum(["instagram", "x", "facebook", "youtube", "tiktok"]),
  kind: z.enum(["account", "channel", "video"]).optional(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().url(),
  numEntries: z.number().int().nonnegative().optional(),
  updatedAt: z.string().optional(),
});

export const catalogSchema = z.object({
  version: z.number(),
  updatedAt: z.string().optional(),
  lists: z.array(catalogEntrySchema),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type Catalog = z.infer<typeof catalogSchema>;

interface CachedCatalog {
  fetchedAt: string;
  catalog: Catalog;
}

export async function fetchCatalog(url: string): Promise<Catalog> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Catalog fetch failed -- ${response.status}`);
  }
  const json = await response.json();
  return catalogSchema.parse(json);
}

export async function getCatalog(
  url: string,
  refreshMinutes: number
): Promise<Catalog> {
  const cached = await chromStorage.getItem<CachedCatalog>("catalog");
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < refreshMinutes * 60 * 1000) {
      return cached.catalog;
    }
  }

  const catalog = await fetchCatalog(url);
  await chromStorage.setItem("catalog", {
    fetchedAt: new Date().toISOString(),
    catalog,
  });
  return catalog;
}

export async function catalogEntriesToBlockLists(
  entries: CatalogEntry[]
): Promise<BlockList[]> {
  const blockLists: BlockList[] = [];
  for (const entry of entries) {
    const [blockList] = await fetchBlockListURLs(entry.url);
    blockList.source = {
      type: "catalog",
      catalogId: entry.id,
      importedAt: new Date().toISOString(),
      updatedAt: entry.updatedAt,
    };
    blockLists.push(blockList);
  }
  return blockLists;
}
