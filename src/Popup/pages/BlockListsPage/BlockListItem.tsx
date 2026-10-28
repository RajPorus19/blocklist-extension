import { Trash, Download, Link, Check, X, RefreshCcw } from "lucide-react";
import { errorLog } from "@/utils/log";
import { BlockList } from "@/lib/types";
import { exportBlockLists } from "@/lib/blockListBuilder";
import { useBlockListActions } from "@/services/blockListStore";
import * as Typography from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export interface BlockListItemProps {
  blockList: BlockList;
}

export default function BlockListItem({ blockList }: BlockListItemProps) {
  const actions = useBlockListActions();

  async function copyURLToClipboard() {
    if (!blockList.infos.url) {
      return errorLog("copyURLToClipboard", "URL not found");
    }

    await navigator.clipboard.writeText(blockList.infos.url);
  }

  const blockedEntries = blockList.entries.filter((entry) => entry.blocked);

  return (
    <Card>
      <CardHeader className="sticky top-[45px] z-10 bg-background">
        <Typography.H4>{blockList.infos.title}</Typography.H4>
        <div className="flex justify-between items-center w-full">
          <div>
            <Button
              variant="default"
              size="icon"
              title="Export blocklist"
              onClick={() => exportBlockLists([blockList])}
            >
              <Download className="h-4 w-4" />
            </Button>
            {blockList.infos.url && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  title="Share blocklist"
                  onClick={copyURLToClipboard}
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Refresh blocklist"
                  onClick={() => actions.checkBlocklistsUpdate([blockList.id])}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => actions.removeBlockLists([blockList.id])}
            title="Delete blocklist"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardDescription className="text-center">
        {blockList.infos.description}
      </CardDescription>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              Entries (
              {blockedEntries.length !== blockList.entries.length
                ? `${blockedEntries.length}/${blockList.entries.length} blocked`
                : blockList.entries.length}
              )
            </AccordionTrigger>
            <AccordionContent>
              <Typography.Ul className="my-0 list-none">
                {blockList.entries.map((entry) => (
                  <li key={entry.id}>
                    {entry.blocked ? (
                      <Check className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 inline" />
                    )}{" "}
                    {entry.name}
                  </li>
                ))}
              </Typography.Ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
