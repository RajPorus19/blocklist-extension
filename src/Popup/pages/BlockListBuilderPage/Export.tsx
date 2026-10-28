import { BlockList } from "@/lib/types";
import { blockListDownload, blockListExport } from "@/lib/blockListBuilder";
import {
  useBlockListBuilderEntries,
  useBlockListBuilderInfos,
  useBlockListBuilderPlatform,
  useBlockListBuilderKind,
} from "@/services/blockListBuilderStore";
import { Button } from "@/components/ui/button";

function Export() {
  const entries = useBlockListBuilderEntries();
  const infos = useBlockListBuilderInfos();
  const platform = useBlockListBuilderPlatform();
  const kind = useBlockListBuilderKind();

  function exportBlockList() {
    const blockList: BlockList = {
      id: "",
      platform,
      kind,
      entries,
      infos,
      enabled: true,
      source: { type: "file", importedAt: new Date().toISOString() },
    };
    blockListDownload(blockListExport(blockList), infos.title);
  }

  const disabled = entries.length === 0 || !infos.title;

  return (
    <Button onClick={exportBlockList} className="m-auto" disabled={disabled}>
      Export
    </Button>
  );
}

export default Export;
