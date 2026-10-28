import { v4 as uuidv4 } from "uuid";
import { BlockList } from "./types";
import * as chromStorage from "@/services/chrome/storage";

interface LegacyUser {
  id: string;
  name: string;
  blocked: boolean;
}

interface LegacyBlockList {
  id?: string;
  users?: LegacyUser[];
  infos?: {
    url?: string;
    title?: string;
    description?: string;
    numUsers?: number;
  };
}

function hasLegacyUsers(value: unknown): value is LegacyBlockList {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as LegacyBlockList).users)
  );
}

/**
 * Converts a pre-refactor block list (with `users`, no `platform`) into the new
 * multi-platform model. Returns `null` when the data is already migrated.
 */
export function migrateBlockLists(raw: unknown): BlockList[] | null {
  if (!Array.isArray(raw) || !raw.some(hasLegacyUsers)) {
    return null;
  }

  return raw.map((legacy): BlockList => {
    const list = legacy as LegacyBlockList;
    const users = list.users ?? [];
    return {
      id: list.id ?? uuidv4(),
      platform: "instagram",
      kind: "account",
      entries: users.map((user) => ({
        platform: "instagram",
        kind: "account",
        id: user.id,
        name: user.name,
        blocked: user.blocked,
      })),
      infos: {
        url: list.infos?.url,
        title: list.infos?.title,
        description: list.infos?.description,
        numEntries: list.infos?.numUsers ?? users.length,
      },
      enabled: true,
      source: {
        type: list.infos?.url ? "url" : "file",
        importedAt: new Date().toISOString(),
      },
    };
  });
}

/** Reads stored block lists and migrates them in place if still legacy. */
export async function migrateBlockListsStorage(): Promise<void> {
  const raw = await chromStorage.getItem<unknown>("blockLists");
  const migrated = migrateBlockLists(raw);
  if (migrated) {
    await chromStorage.setItem("blockLists", migrated);
  }
}
