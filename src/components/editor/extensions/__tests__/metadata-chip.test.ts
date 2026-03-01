// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MetadataChip } from "../metadata-chip";

describe("MetadataChip", () => {
  it("has correct name", () => {
    const extension = MetadataChip.create();
    expect(extension.name).toBe("metadataChip");
  });

  it("is inline and atom", () => {
    const extension = MetadataChip.create();
    expect(extension.config.inline).toBe(true);
    expect(extension.config.atom).toBe(true);
  });

  it("defines required attributes", () => {
    const extension = MetadataChip.create();
    const attrs = extension.config.addAttributes?.call(extension);
    expect(attrs).toHaveProperty("metadataKey");
    expect(attrs).toHaveProperty("chipType");
    expect(attrs).toHaveProperty("display");
  });

  it("is selectable but not draggable", () => {
    const extension = MetadataChip.create();
    expect(extension.config.selectable).toBe(true);
    expect(extension.config.draggable).toBe(false);
  });

  it("belongs to inline group", () => {
    const extension = MetadataChip.create();
    expect(extension.config.group).toBe("inline");
  });

  it("provides markdown serialization in storage", () => {
    const extension = MetadataChip.create();
    const storage = extension.config.addStorage?.call(extension);
    expect(storage).toHaveProperty("markdown");
    expect(storage?.markdown).toHaveProperty("serialize");
  });

  it("serializes display text for markdown", () => {
    const extension = MetadataChip.create();
    const storage = extension.config.addStorage?.call(extension);
    let written = "";
    const state = { write: (text: string) => (written = text) };
    const node = { attrs: { display: "near Karlsplatz" } };
    storage?.markdown.serialize(state, node);
    expect(written).toBe("near Karlsplatz");
  });

  it("serializes empty string when display is missing", () => {
    const extension = MetadataChip.create();
    const storage = extension.config.addStorage?.call(extension);
    let written = "";
    const state = { write: (text: string) => (written = text) };
    const node = { attrs: {} };
    storage?.markdown.serialize(state, node);
    expect(written).toBe("");
  });
});
