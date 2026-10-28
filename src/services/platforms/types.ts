import { BlockListEntry, PlatformId, TargetKind } from "@/lib/types";

export type BackendId = "api" | "dom";
export type BlockAction = "block" | "unblock";

export interface BlockingResult {
  entryId: string;
  ok: boolean;
  error?: string;
}

export interface BlockingOptions {
  delayMs: number;
  batchSize: number;
}

export interface BlockingBackend {
  id: BackendId;
  checkConnection(): Promise<boolean>;
  block(
    entries: BlockListEntry[],
    action: BlockAction,
    options: BlockingOptions
  ): Promise<BlockingResult[]>;
}

export interface ResolvedTarget {
  id: string;
  name: string;
  kind: TargetKind;
}

export interface PlatformAdapter {
  id: PlatformId;
  label: string;
  hosts: string[];
  hostnames: string[];
  cookieDomain: string;
  defaultKind: TargetKind;
  parseEntryLine(line: string): BlockListEntry | undefined;
  exportEntryLine(entry: BlockListEntry): string;
  resolveTarget(url: string): Promise<ResolvedTarget | null>;
  backends: Partial<Record<BackendId, BlockingBackend>>;
  defaultBackend: BackendId;
}
