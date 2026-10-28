import { BlockList } from "./types";
import { toBlockList } from "./blockList";

export async function readBlockListFiles(files: File[]): Promise<BlockList[]> {
  const blockLists: BlockList[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileText = await file.text();
    const [blockList] = toBlockList("file", [undefined, fileText]);
    blockLists.push(blockList);
  }
  return blockLists;
}
