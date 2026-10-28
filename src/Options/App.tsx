import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import OptionsForm from "./pages/OptionsForm";
import MarkDownPage from "./pages/MarkDownPage";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import { useTheme } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/toaster"

export default function App() {
  useTheme();

  const manifest = chrome.runtime.getManifest();

  return (
    <div className="px-2">
      <Tabs defaultValue="options">
        <header className="sticky top-0 z-50 shadow-md pt-2 bg-background">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
        </header>
        <TabsContent value="options">
          <OptionsForm />
        </TabsContent>
        <TabsContent value="catalog">
          <CatalogBrowser />
        </TabsContent>
        <TabsContent value="changelog">
          <MarkDownPage
            title="Changelog"
            url="https://raw.githubusercontent.com/AntoninJuquel/instagram-blocklist-extension/main/CHANGELOG.md"
          />
        </TabsContent>
        <TabsContent value="about">
          <MarkDownPage
            title="About"
            url="https://raw.githubusercontent.com/AntoninJuquel/instagram-blocklist-extension/main/.github/README.md"
          />
        </TabsContent>
      </Tabs>
      <Card className="my-2 items-center">
        <CardHeader>
          version: {manifest.version_name}
          <br />
          {manifest.author
            ? `Copyright © ${new Date().getFullYear()} ${manifest.author}`
            : ""}
        </CardHeader>
      </Card>
      <Toaster />
    </div>
  );
}
