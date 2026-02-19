import { describe, it, expect } from "vitest";
import { SchemaType } from "@google/generative-ai";
import {
  profileExtractionSchema,
  postingExtractionSchema,
} from "../extraction-schemas";

describe("profileExtractionSchema", () => {
  it("includes correct fields for extract mode", () => {
    const schema = profileExtractionSchema("extract");
    expect(schema.type).toBe(SchemaType.OBJECT);
    expect(schema.required).toEqual(["skills"]);
    expect(schema.properties!.updated_text).toBeUndefined();
    expect(schema.properties!.full_name).toBeDefined();
    expect(schema.properties!.skills).toBeDefined();
    expect(schema.properties!.skill_levels).toBeDefined();
    expect(schema.properties!.languages).toBeDefined();
    expect(schema.properties!.location_preference).toBeDefined();
  });

  it("includes updated_text for update mode", () => {
    const schema = profileExtractionSchema("update");
    expect(schema.required).toEqual(["updated_text", "skills"]);
    expect(schema.properties!.updated_text).toBeDefined();
    expect(schema.properties!.full_name).toBeDefined();
  });

  it("does not include stale v1 fields", () => {
    const extractSchema = profileExtractionSchema("extract");
    const updateSchema = profileExtractionSchema("update");
    for (const schema of [extractSchema, updateSchema]) {
      expect(schema.properties!.experience_level).toBeUndefined();
      expect(schema.properties!.collaboration_style).toBeUndefined();
      expect(schema.properties!.availability_hours).toBeUndefined();
      expect(schema.properties!.project_preferences).toBeUndefined();
    }
  });
});

describe("postingExtractionSchema", () => {
  it("includes correct fields for extract mode", () => {
    const schema = postingExtractionSchema("extract");
    expect(schema.type).toBe(SchemaType.OBJECT);
    expect(schema.required).toEqual(["title", "description", "skills"]);
    expect(schema.properties!.updated_text).toBeUndefined();
    expect(schema.properties!.title).toBeDefined();
    expect(schema.properties!.skills).toBeDefined();
    expect(schema.properties!.team_size_min).toBeDefined();
    expect(schema.properties!.team_size_max).toBeDefined();
    expect(schema.properties!.category).toBeDefined();
    expect(schema.properties!.mode).toBeDefined();
  });

  it("includes updated_text for update mode", () => {
    const schema = postingExtractionSchema("update");
    expect(schema.required).toEqual(["updated_text", "skills"]);
    expect(schema.properties!.updated_text).toBeDefined();
    expect(schema.properties!.team_size_min).toBeDefined();
  });

  it("uses enum format for category and mode", () => {
    const schema = postingExtractionSchema("extract");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = schema.properties!.category as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mode = schema.properties!.mode as any;
    expect(category.format).toBe("enum");
    expect(mode.format).toBe("enum");
  });
});
