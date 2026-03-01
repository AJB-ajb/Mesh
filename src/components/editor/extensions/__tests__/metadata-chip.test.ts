// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MetadataChip } from "../metadata-chip";

describe("MetadataChip", () => {
  it("has correct name", () => {
    expect(MetadataChip.name).toBe("metadataChip");
  });

  it("is inline and atom", () => {
    expect(MetadataChip.config.inline).toBe(true);
    expect(MetadataChip.config.atom).toBe(true);
  });

  it("defines required attributes", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = (MetadataChip.config.addAttributes as any)?.call({});
    expect(attrs).toHaveProperty("metadataKey");
    expect(attrs).toHaveProperty("chipType");
    expect(attrs).toHaveProperty("display");
  });

  it("is selectable but not draggable", () => {
    expect(MetadataChip.config.selectable).toBe(true);
    expect(MetadataChip.config.draggable).toBe(false);
  });

  it("belongs to inline group", () => {
    expect(MetadataChip.config.group).toBe("inline");
  });

  it("provides markdown serialization in storage", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (MetadataChip.config.addStorage as any)?.call({});
    expect(storage).toHaveProperty("markdown");
    expect(storage?.markdown).toHaveProperty("serialize");
  });

  it("serializes display text for markdown", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (MetadataChip.config.addStorage as any)?.call({});
    let written = "";
    const state = { write: (text: string) => (written = text) };
    const node = { attrs: { display: "near Karlsplatz" } };
    storage?.markdown.serialize(state, node);
    expect(written).toBe("near Karlsplatz");
  });

  it("serializes empty string when display is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (MetadataChip.config.addStorage as any)?.call({});
    let written = "";
    const state = { write: (text: string) => (written = text) };
    const node = { attrs: {} };
    storage?.markdown.serialize(state, node);
    expect(written).toBe("");
  });
});
