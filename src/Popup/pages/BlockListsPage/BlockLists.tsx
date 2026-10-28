import { useEffect } from "react";
import { BlockList } from "@/lib/types";
import { exportBlockLists } from "@/lib/blockListBuilder";
import { useBlockLists, useBlockListActions } from "@/services/blockListStore";
import { Message, MessageType } from "@/services/chrome/messaging";
import * as Typography from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import BlockListItem from "./BlockListItem";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function BlockLists() {
  const blockLists = useBlockLists();
  const blockListActions = useBlockListActions();

  useEffect(() => {
    blockListActions.getBlockLists();

    const onUpdateMessage = (message: Message<[string[], BlockList[]]>) => {
      if (message.type === MessageType.BLOCKLITS_UPDATED) {
        blockListActions.updateBlockLists(...message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(onUpdateMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onUpdateMessage);
    };
  }, [blockListActions]);

  const totalBlockedUsers = blockLists.reduce(
    (acc, blockList) =>
      acc + blockList.entries.filter((entry) => entry.blocked).length,
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          {blockLists.length} block list{blockLists.length > 1 ? "s" : ""}
          <br />
          {totalBlockedUsers} user{totalBlockedUsers > 1 ? "s" : ""} blocked
        </CardHeader>
        <CardContent className="flex justify-between items-center w-full">
          <div>
            <Button onClick={() => exportBlockLists(blockLists)}>EXPORT</Button>
            <Button
              variant="outline"
              onClick={() => blockListActions.checkBlocklistsUpdate(["*"])}
            >
              UPDATE ALL
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={() => blockListActions.removeBlockLists(["*"])}
          >
            DELETE ALL
          </Button>
        </CardContent>
      </Card>

      {blockLists.length === 0 && (
        <Typography.Blockquote>
          You don't have any block lists yet.
          <br />
          You can start by choosing a block list{" "}
          <Typography.Code>
            <a
              href="https://blockout.lol/blocklists/"
              target="_blank"
              rel="noreferrer"
              title="Go to blockout block lists"
            >
              here
            </a>
          </Typography.Code>
          .
        </Typography.Blockquote>
      )}

      {blockLists.map((blockList) => (
        <BlockListItem key={blockList.id} blockList={blockList} />
      ))}
    </div>
  );
}
