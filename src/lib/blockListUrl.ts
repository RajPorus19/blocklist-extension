import { BlockList } from "./types";
import { toBlockList } from "./blockList";

export const blockListAllowedHosts = [
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
  "blockout.lol",
];
export function validateBlockListURLs(url: string): string[] {
  return [...new Set(url.split("|"))]
    .map((url) => url.trim())
    .filter((url) => {
      try {
        const parsedUrl = new URL(url);
        const correctProtocol = parsedUrl.protocol === "https:";
        const allowedHost = blockListAllowedHosts.includes(parsedUrl.host);
        return correctProtocol && allowedHost;
      } catch (e) {
        return false;
      }
    });
}
export async function fetchBlockListURLs(url: string): Promise<BlockList[]> {
  const blockListURLs = [...new Set(url.split("|"))];
  const blockListTexts = await Promise.all(
    blockListURLs.map((url) =>
      fetch(url.trim()).then((res) => {
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`failed fetch -- ${res.status} ${res.statusText}`);
        }

        return res.text();
      })
    )
  );
  const blocklists: [string, string][] = blockListURLs.map(
    (blockListURL, index) => [blockListURL, blockListTexts[index]]
  );
  return toBlockList("url", ...blocklists);
}
