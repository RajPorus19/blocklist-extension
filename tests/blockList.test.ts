import { describe, it, expect } from "vitest";
import { toBlockList } from "@/lib/blockList";

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
    const [list] = toBlockList([undefined, sample]);
    expect(list.infos.title).toBe("Test List");
    expect(list.infos.description).toBe("A test list");
  });

  it("keeps full usernames (underscores, dots, digits)", () => {
    const [list] = toBlockList([undefined, sample]);
    const names = list.users.map((u) => u.name);
    expect(names).toEqual([
      "plainuser",
      "user_with_underscore",
      "user.with.dots",
      "user_123",
      "trailing.dot.",
    ]);
  });

  it("does not truncate usernames at special characters", () => {
    const [list] = toBlockList([undefined, sample]);
    const byId = new Map(list.users.map((u) => [u.id, u.name]));
    expect(byId.get("124")).toBe("user_with_underscore");
    expect(byId.get("125")).toBe("user.with.dots");
  });

  it("ignores invalid lines and dedupes ids", () => {
    const dup = [
      "instagramblocklist:id=1;name=alpha",
      "instagramblocklist:id=1;name=alpha",
      "instagramblocklist:id=2;name=beta",
    ].join("\n");
    const [list] = toBlockList([undefined, dup]);
    expect(list.users).toHaveLength(2);
    expect(list.infos.numUsers).toBe(2);
  });
});
