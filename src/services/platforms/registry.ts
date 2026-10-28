import { PlatformId } from "@/lib/types";
import { PlatformAdapter } from "./types";
import { instagramAdapter } from "./instagram";
import { xAdapter } from "./x";
import { tiktokAdapter } from "./tiktok";
import { facebookAdapter } from "./facebook";
import { youtubeAdapter } from "./youtube";

const adapters: PlatformAdapter[] = [
  instagramAdapter,
  xAdapter,
  tiktokAdapter,
  facebookAdapter,
  youtubeAdapter,
];

export function getPlatformAdapter(id: PlatformId): PlatformAdapter {
  const adapter = adapters.find((candidate) => candidate.id === id);
  if (!adapter) {
    throw new Error(`No platform adapter registered for "${id}".`);
  }
  return adapter;
}

export function listPlatformAdapters(): PlatformAdapter[] {
  return adapters;
}

export function detectPlatformAdapter(url: string): PlatformAdapter | null {
  try {
    const hostname = new URL(url).hostname;
    return (
      adapters.find((adapter) => adapter.hostnames.includes(hostname)) ?? null
    );
  } catch {
    return null;
  }
}

export async function checkAdapterConnection(
  adapter: PlatformAdapter
): Promise<boolean> {
  const backend = adapter.backends[adapter.defaultBackend];
  if (!backend) {
    return false;
  }
  try {
    return await backend.checkConnection();
  } catch {
    return false;
  }
}
