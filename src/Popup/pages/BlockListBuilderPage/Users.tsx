import { useEffect, useState } from "react";
import { Trash } from "lucide-react";
import {
  getCurrentTarget,
  ResolvedCurrentTarget,
} from "@/lib/blockListBuilder";
import {
  useBlockListBuilderEntries,
  useBlockListBuilderActions,
} from "@/services/blockListBuilderStore";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function Users() {
  const [currentTarget, setCurrentTarget] = useState<
    ResolvedCurrentTarget | null | false
  >(null);
  const entries = useBlockListBuilderEntries();
  const blockListBuilderActions = useBlockListBuilderActions();

  async function addCurrentUser() {
    if (currentTarget && !alreadyAdded()) {
      blockListBuilderActions.addEntry(currentTarget.entry);
    }
  }

  useEffect(() => {
    async function handleTabUpdate() {
      try {
        setCurrentTarget(null);
        setCurrentTarget(await getCurrentTarget());
      } catch {
        setCurrentTarget(false);
      }
    }

    handleTabUpdate();

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  function alreadyAdded() {
    if (currentTarget) {
      return (
        entries.find((entry) => entry.id === currentTarget.entry.id) !==
        undefined
      );
    }
    return false;
  }

  function buttonMessage() {
    if (currentTarget) {
      if (alreadyAdded()) {
        return "User already added";
      }
      return `Add ${currentTarget.entry.name}`;
    } else if (currentTarget === false) {
      return "Not on a supported profile";
    } else {
      return "Loading...";
    }
  }

  return (
    <Table className="caption-top">
      <TableCaption>
        <Button
          onClick={addCurrentUser}
          disabled={!currentTarget || alreadyAdded()}
        >
          {buttonMessage()}
        </Button>
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Id</TableHead>
          <TableHead className="text-right">
            <Button
              size="icon"
              variant="destructive"
              onClick={blockListBuilderActions.removeAllEntries}
              title="Remove all entries"
              disabled={entries.length === 0}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...entries].reverse().map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.name}</TableCell>
            <TableCell>{entry.id}</TableCell>
            <TableCell className="text-right">
              <Button
                size="icon"
                variant="destructive"
                onClick={() => blockListBuilderActions.removeEntry(entry.id)}
                title={`Remove ${entry.name}`}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
