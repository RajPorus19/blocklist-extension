import { describe, it, expect } from "vitest";
import { toBlockList } from "@/lib/blockList";
import { migrateBlockLists } from "@/lib/migration";

const sample = [
  "title:Test List",
  "description:A test list",
  "instagramblocklist:id=123;name=plainuser",
  "instagramblocklist:id=124;name=user_with_underscore",
  "instagramblocklist:id=125;name=user.with.dots",
  "instagramblocklist:id=126;name=user_123",
  "instagramblocklist:id=127;name=trailing.dot.",
  "not-a-valid-line",
  "",
].join("\n");

describe("toBlockList", () => {
  it("parses title and description", () => {
    const [list] = toBlockList("file", [undefined, sample]);
    expect(list.infos.title).toBe("Test List");
    expect(list.infos.description).toBe("A test list");
  });

  it("keeps full usernames (underscores, dots, digits)", () => {
    const [list] = toBlockList("file", [undefined, sample]);
    const names = list.entries.map((entry) => entry.name);
    expect(names).toEqual([
      "plainuser",
      "user_with_underscore",
      "user.with.dots",
      "user_123",
      "trailing.dot.",
    ]);
  });

  it("does not truncate usernames at special characters", () => {
    const [list] = toBlockList("file", [undefined, sample]);
    const byId = new Map(list.entries.map((entry) => [entry.id, entry.name]));
    expect(byId.get("124")).toBe("user_with_underscore");
    expect(byId.get("125")).toBe("user.with.dots");
  });

  it("ignores invalid lines and dedupes ids", () => {
    const dup = [
      "instagramblocklist:id=1;name=alpha",
      "instagramblocklist:id=1;name=alpha",
      "instagramblocklist:id=2;name=beta",
    ].join("\n");
    const [list] = toBlockList("file", [undefined, dup]);
    expect(list.entries).toHaveLength(2);
    expect(list.infos.numEntries).toBe(2);
  });

  it("defaults to instagram platform and sets source type", () => {
    const [list] = toBlockList("url", [undefined, sample]);
    expect(list.platform).toBe("instagram");
    expect(list.kind).toBe("account");
    expect(list.source.type).toBe("url");
    expect(list.enabled).toBe(true);
  });
});

describe("migrateBlockLists", () => {
  it("migrates legacy users to entries", () => {
    const legacy = [
      {
        id: "legacy-id",
        users: [
          { id: "1", name: "alpha", blocked: true },
          { id: "2", name: "beta", blocked: false },
        ],
        infos: {
          url: "https://example.com/x.txt",
          title: "T",
          description: "D",
          numUsers: 2,
        },
      },
    ];
    const migrated = migrateBlockLists(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated![0].platform).toBe("instagram");
    expect(migrated![0].kind).toBe("account");
    expect(migrated![0].entries).toHaveLength(2);
    expect(migrated![0].infos.numEntries).toBe(2);
    expect(migrated![0].source.type).toBe("url");
  });

  it("returns null for already-migrated data", () => {
    const modern = [{ id: "x", entries: [], infos: { numEntries: 0 } }];
    expect(migrateBlockLists(modern)).toBeNull();
  });
});
