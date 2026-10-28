import { useEffect, useState } from "react";
import * as Typography from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockListsPage, BlockListBuilderPage } from "@/Popup/pages";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import { useTheme } from "@/hooks/useTheme";
import {
  checkAdapterConnection,
  listPlatformAdapters,
} from "@/services/platforms/registry";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("blockLists");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useTheme();

  useEffect(() => {
    chrome.storage.local.get("activeTab", (data) => {
      setActiveTab(data.activeTab || "blockLists");
    });

    (async () => {
      const adapters = listPlatformAdapters();
      const connected: string[] = [];
      for (const adapter of adapters) {
        if (await checkAdapterConnection(adapter)) {
          connected.push(adapter.id);
        }
      }
      setConnectedPlatforms(connected);
    })();
  }, []);

  async function onTabChange(tab: string) {
    await chrome.storage.local.set({ activeTab: tab });
    setActiveTab(tab);
  }

  const disconnected = connectedPlatforms.length === 0;

  return (
    <div className="w-[500px] h-full flex flex-col justify-between bg-background">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <header className="sticky top-0 z-50 shadow-md pt-2 bg-background">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="blockLists">Lists</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="builder">Builder</TabsTrigger>
          </TabsList>
        </header>
        <TabsContent value="blockLists">
          {disconnected && (
            <div className="text-center">
              <Typography.Lead className="text-destructive">
                Not connected to any platform
              </Typography.Lead>
              <Typography.Lead className="text-destructive">
                You won't be able to block users if you are not logged in
              </Typography.Lead>
            </div>
          )}
          <BlockListsPage />
        </TabsContent>
        <TabsContent value="discover">
          <CatalogBrowser />
        </TabsContent>
        <TabsContent value="builder">
          <BlockListBuilderPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
