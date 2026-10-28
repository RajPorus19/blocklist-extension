import { describe, it, expect } from "vitest";
import {
  facebookAdapter,
} from "@/services/platforms/facebook";
import { xAdapter } from "@/services/platforms/x";
import { tiktokAdapter } from "@/services/platforms/tiktok";
import { youtubeAdapter } from "@/services/platforms/youtube";
import { instagramAdapter } from "@/services/platforms/instagram";
import { toBlockList } from "@/lib/blockList";

describe("platform entry parsers", () => {
  it("parses tiktok entries", () => {
    const entry = tiktokAdapter.parseEntryLine(
      "tiktokblocklist:id=123456;name=user.name"
    );
    expect(entry).toMatchObject({
      platform: "tiktok",
      kind: "account",
      id: "123456",
      name: "user.name",
    });
  });

  it("parses x entries", () => {
    const entry = xAdapter.parseEntryLine("xblocklist:id=789;name=user_name");
    expect(entry).toMatchObject({ platform: "x", id: "789", name: "user_name" });
  });

  it("parses facebook entries (name with spaces)", () => {
    const entry = facebookAdapter.parseEntryLine(
      "facebookblocklist:id=42;name=John Doe"
    );
    expect(entry).toMatchObject({
      platform: "facebook",
      id: "42",
      name: "John Doe",
    });
  });

  it("parses youtube channel and video entries", () => {
    const channel = youtubeAdapter.parseEntryLine(
      "youtubeblocklist:kind=channel;id=UC123ABC;name=My Channel"
    );
    expect(channel).toMatchObject({ kind: "channel", id: "UC123ABC" });

    const video = youtubeAdapter.parseEntryLine(
      "youtubeblocklist:kind=video;id=dQw4w9WgXcQ;name=A Video"
    );
    expect(video).toMatchObject({ kind: "video", id: "dQw4w9WgXcQ" });
  });

  it("round-trips instagram entries through export", () => {
    const entry = instagramAdapter.parseEntryLine(
      "instagramblocklist:id=123;name=foo.bar"
    );
    expect(entry?.name).toBe("foo.bar");
    expect(instagramAdapter.exportEntryLine(entry!)).toBe(
      "instagramblocklist:id=123;name=foo.bar"
    );
  });
});

describe("toBlockList platform detection", () => {
  it("detects platform from the platform: header", () => {
    const contents = [
      "platform:tiktok",
      "title:TikTok list",
      "tiktokblocklist:id=1;name=alpha",
      "tiktokblocklist:id=2;name=beta",
    ].join("\n");
    const [list] = toBlockList("url", [undefined, contents]);
    expect(list.platform).toBe("tiktok");
    expect(list.entries).toHaveLength(2);
    expect(list.entries[0].name).toBe("alpha");
  });

  it("detects youtube channel/video kind from entries", () => {
    const contents = [
      "platform:youtube",
      "youtubeblocklist:kind=video;id=vid1;name=V1",
      "youtubeblocklist:kind=video;id=vid2;name=V2",
    ].join("\n");
    const [list] = toBlockList("url", [undefined, contents]);
    expect(list.platform).toBe("youtube");
    expect(list.kind).toBe("video");
  });
});
