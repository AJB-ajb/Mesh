// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildPostingDbRow,
  validatePostingBody,
} from "@/lib/api/postings-validation";
import type { ChipMetadataMap } from "@/lib/types/posting";

describe("postings-validation chipMetadata (deprecated)", () => {
  it("no longer includes chip_metadata in DB row even when provided", () => {
    const chipMetadata: ChipMetadataMap = {
      location_0: {
        type: "location",
        display: "near Karlsplatz, Munich",
        data: { displayName: "Karlsplatz, Munich", lat: 48.13, lng: 11.58 },
      },
    };

    const row = buildPostingDbRow(
      { description: "Test", chipMetadata },
      "create",
    );

    // chipMetadata is deprecated in v0.6 and no longer written to new rows
    expect(row).not.toHaveProperty("chip_metadata");
  });

  it("omits chip_metadata when empty object provided", () => {
    const row = buildPostingDbRow(
      { description: "Test", chipMetadata: {} },
      "create",
    );

    expect(row).not.toHaveProperty("chip_metadata");
  });

  it("omits chip_metadata when not provided", () => {
    const row = buildPostingDbRow({ description: "Test" }, "create");

    expect(row).not.toHaveProperty("chip_metadata");
  });

  it("validates posting body with chipMetadata (field still accepted)", () => {
    expect(() =>
      validatePostingBody(
        {
          description: "Test",
          chipMetadata: {
            time_0: {
              type: "time",
              display: "weekday evenings",
              data: { days: ["mon", "tue"], times: ["evening"] },
            },
          },
        },
        "create",
      ),
    ).not.toThrow();
  });

  it("builds row with other fields even when chipMetadata provided", () => {
    const chipMetadata: ChipMetadataMap = {
      skills_0: {
        type: "skills",
        display: "Skills: React, TypeScript",
        data: {
          skills: [
            { skillId: "s1", name: "React", levelMin: 3 },
            { skillId: "s2", name: "TypeScript", levelMin: null },
          ],
        },
      },
    };

    const row = buildPostingDbRow(
      {
        description: "Looking for devs",
        category: "tech",
        chipMetadata,
      },
      "create",
    );

    expect(row).not.toHaveProperty("chip_metadata");
    expect(row.category).toBe("tech");
    expect(row.description).toBe("Looking for devs");
  });
});
