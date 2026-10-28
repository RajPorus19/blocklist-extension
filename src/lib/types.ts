export type PlatformId = "instagram" | "x" | "facebook" | "youtube" | "tiktok";

/**
 * The nature of a block target.
 * - `account` = a user/account on a social network (Instagram, X, TikTok, Facebook).
 * - `channel` = a YouTube channel.
 * - `video`   = a YouTube video (only "don't recommend" is possible there).
 */
export type TargetKind = "account" | "channel" | "video";

export interface BlockListEntry {
  platform: PlatformId;
  kind: TargetKind;
  id: string;
  name: string;
  blocked: boolean;
  error?: string;
}

export interface BlockListInfo {
  url?: string;
  title?: string;
  description?: string;
  numEntries: number;
  category?: string;
  tags?: string[];
}

export interface BlockListSource {
  type: "catalog" | "url" | "file";
  catalogId?: string;
  importedAt: string;
  updatedAt?: string;
}

export interface BlockList {
  id: string;
  platform: PlatformId;
  kind: TargetKind;
  entries: BlockListEntry[];
  infos: BlockListInfo;
  enabled: boolean;
  source: BlockListSource;
}
