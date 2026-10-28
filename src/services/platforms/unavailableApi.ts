import { BlockingBackend } from "./types";

/**
 * An API backend that cannot block yet (e.g. signed internal API not
 * reverse-engineered). It still reports the login state but returns a clear
 * per-entry error when blocking is attempted, so the fallback logic can move
 * on to the DOM backend instead of failing silently.
 */
export function createUnavailableApiBackend(
  label: string,
  reason: string,
  checkLogin: () => Promise<boolean>
): BlockingBackend {
  return {
    id: "api",
    async checkConnection() {
      return checkLogin();
    },
    async block(entries) {
      return entries.map((entry) => ({
        entryId: entry.id,
        ok: false,
        error: `${label} API backend unavailable: ${reason}`,
      }));
    },
  };
}
