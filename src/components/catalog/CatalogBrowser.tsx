import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { PlatformId } from "@/lib/types";
import { CatalogEntry, catalogEntriesToBlockLists } from "@/lib/catalog";
import { useBlockLists, useBlockListActions } from "@/services/blockListStore";
import {
  useCatalog,
  useCatalogLoading,
  useCatalogError,
  useCatalogSelectedIds,
  useCatalogActivePlatform,
  useCatalogActions,
} from "@/services/catalogStore";
import { listPlatformAdapters } from "@/services/platforms/registry";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as Typography from "@/components/ui/typography";

const platformLabels: Record<PlatformId, string> = {
  instagram: "Instagram",
  x: "X / Twitter",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function CatalogEntryRow({
  entry,
  selected,
  imported,
  onToggle,
}: {
  entry: CatalogEntry;
  selected: boolean;
  imported: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={imported ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{entry.title}</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected || imported} disabled={imported} onChange={onToggle} />
            {imported ? "Imported" : "Select"}
          </label>
        </div>
        <CardDescription>
          {platformLabels[entry.platform]}
          {entry.numEntries != null ? ` · ${entry.numEntries} entries` : ""}
        </CardDescription>
      </CardHeader>
      {entry.description && (
        <CardContent>
          <Typography.Muted>{entry.description}</Typography.Muted>
        </CardContent>
      )}
    </Card>
  );
}

export default function CatalogBrowser() {
  const catalog = useCatalog();
  const loading = useCatalogLoading();
  const error = useCatalogError();
  const selectedIds = useCatalogSelectedIds();
  const activePlatform = useCatalogActivePlatform();
  const actions = useCatalogActions();
  const blockLists = useBlockLists();
  const blockListActions = useBlockListActions();

  useEffect(() => {
    actions.load();
  }, [actions]);

  const importedCatalogIds = new Set(
    blockLists
      .map((list) => list.source.catalogId)
      .filter((id): id is string => Boolean(id))
  );

  const adapters = listPlatformAdapters();
  const lists =
    catalog?.lists.filter(
      (entry) =>
        activePlatform === "all" || entry.platform === activePlatform
    ) ?? [];

  async function importSelected() {
    const selected = (catalog?.lists ?? []).filter(
      (entry) => selectedIds.includes(entry.id) && !importedCatalogIds.has(entry.id)
    );
    if (!selected.length) {
      return;
    }
    const blockListsToAdd = await catalogEntriesToBlockLists(selected);
    await blockListActions.addBlockLists(blockListsToAdd);
    actions.clearSelection();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Discover block lists</CardTitle>
          <CardDescription>
            Browse premade lists and import the ones you want.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activePlatform === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => actions.setActivePlatform("all")}
            >
              All
            </Button>
            {adapters.map((adapter) => (
              <Button
                key={adapter.id}
                variant={activePlatform === adapter.id ? "default" : "outline"}
                size="sm"
                onClick={() => actions.setActivePlatform(adapter.id)}
              >
                {platformLabels[adapter.id]}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.refresh()}
            disabled={loading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {loading && <Typography.Lead>Loading catalog…</Typography.Lead>}
      {error && (
        <Typography.Lead className="text-destructive">{error}</Typography.Lead>
      )}
      {!loading && !error && lists.length === 0 && (
        <Typography.Blockquote>No lists for this platform yet.</Typography.Blockquote>
      )}

      {lists.map((entry) => (
        <CatalogEntryRow
          key={entry.id}
          entry={entry}
          selected={selectedIds.includes(entry.id)}
          imported={importedCatalogIds.has(entry.id)}
          onToggle={() => actions.toggleSelect(entry.id)}
        />
      ))}

      {lists.length > 0 && (
        <Button onClick={importSelected} disabled={!selectedIds.length}>
          Import selected
        </Button>
      )}
    </div>
  );
}
