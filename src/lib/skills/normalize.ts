/**
 * Shared skill normalization utility
 * Resolves a user-typed skill string to a tree node via:
 * 1. Exact name match (case-insensitive)
 * 2. Alias match
 * 3. LLM auto-add (optional, requires Gemini)
 *
 * Extracted from src/app/api/skills/normalize/route.ts for reuse
 * in batch migration and other server-side contexts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type NormalizeResult = {
  nodeId: string;
  name: string;
  created: boolean;
};

/**
 * Normalizes a skill string to a skill_nodes row.
 * Returns null if the skill cannot be resolved (LLM not configured or LLM fails).
 *
 * @param supabase Authenticated Supabase client
 * @param skill User-typed skill string
 * @param options.useLLM Whether to attempt LLM auto-add if no match found (default: true)
 */
export async function normalizeSkillString(
  supabase: SupabaseClient,
  skill: string,
  options: { useLLM?: boolean } = {},
): Promise<NormalizeResult | null> {
  const trimmed = skill.trim();
  if (!trimmed) return null;

  const { useLLM = true } = options;

  // Step 1: Exact name match (case-insensitive)
  const { data: nameMatch } = await supabase
    .from("skill_nodes")
    .select("id, name")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (nameMatch) {
    return { nodeId: nameMatch.id, name: nameMatch.name, created: false };
  }

  // Step 2: Alias match
  const { data: allNodes } = await supabase
    .from("skill_nodes")
    .select("id, name, aliases");

  if (allNodes) {
    const lowerSkill = trimmed.toLowerCase();
    const aliasMatch = allNodes.find((n) =>
      (n.aliases as string[])?.some(
        (a: string) => a.toLowerCase() === lowerSkill,
      ),
    );
    if (aliasMatch) {
      return {
        nodeId: aliasMatch.id,
        name: aliasMatch.name,
        created: false,
      };
    }
  }

  // Step 3: LLM auto-add (only if opted in and configured)
  if (!useLLM) return null;

  try {
    const { isGeminiConfigured, generateStructuredJSON } =
      await import("@/lib/ai/gemini");
    if (!isGeminiConfigured()) return null;

    const { SchemaType } = await import("@google/generative-ai");

    // Fetch full tree for LLM context
    const { data: treeNodes } = await supabase
      .from("skill_nodes")
      .select("id, name, parent_id, depth, is_leaf")
      .order("depth")
      .order("name");

    if (!treeNodes) return null;

    const treeText = buildTreeText(treeNodes);

    const llmResult = await generateStructuredJSON<{
      action: "map" | "add";
      existing_node_name?: string;
      name?: string;
      parent_name?: string;
      aliases?: string[];
    }>({
      systemPrompt: `You are a skill taxonomy manager. Given a user-typed skill and the existing skill tree, decide:
1. If the skill matches or is a synonym of an existing node → return action "map" with existing_node_name
2. If it's a new valid skill → return action "add" with name, parent_name, and aliases

Rules:
- Pick the parent where "knows X → knows parent" is strongest
- Use the most widely recognized name, title case for multi-word
- Include common alternative names as aliases
- Do NOT create grouping nodes — only add leaf skills
- Maximum depth: 5 levels from root
- If this looks like a typo of an existing node, map to the closest match`,
      userPrompt: `Skill to classify: "${trimmed}"

Current skill tree:
${treeText}`,
      schema: {
        type: SchemaType.OBJECT,
        properties: {
          action: {
            type: SchemaType.STRING,
            description:
              'Either "map" (skill matches an existing node) or "add" (create a new leaf node)',
            format: "enum",
            enum: ["map", "add"],
          },
          existing_node_name: {
            type: SchemaType.STRING,
            description:
              'If action is "map", the exact name of the existing node this skill maps to',
          },
          name: {
            type: SchemaType.STRING,
            description:
              'If action is "add", the canonical display name for the new skill',
          },
          parent_name: {
            type: SchemaType.STRING,
            description:
              'If action is "add", the exact name of the parent node to place this under',
          },
          aliases: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
              'If action is "add", alternative names that should map to this new skill',
          },
        },
        required: ["action"],
      },
      temperature: 0.2,
    });

    if (llmResult.action === "map" && llmResult.existing_node_name) {
      const mapped = treeNodes.find(
        (n) =>
          n.name.toLowerCase() === llmResult.existing_node_name!.toLowerCase(),
      );
      if (mapped) {
        // Add user's input as alias
        const { data: fullNode } = await supabase
          .from("skill_nodes")
          .select("aliases")
          .eq("id", mapped.id)
          .single();

        if (fullNode) {
          const currentAliases = (fullNode.aliases as string[]) ?? [];
          if (
            !currentAliases.some(
              (a) => a.toLowerCase() === trimmed.toLowerCase(),
            ) &&
            mapped.name.toLowerCase() !== trimmed.toLowerCase()
          ) {
            await supabase
              .from("skill_nodes")
              .update({ aliases: [...currentAliases, trimmed] })
              .eq("id", mapped.id);
          }
        }

        return { nodeId: mapped.id, name: mapped.name, created: false };
      }
    }

    if (llmResult.action === "add" && llmResult.name && llmResult.parent_name) {
      const parent = treeNodes.find(
        (n) => n.name.toLowerCase() === llmResult.parent_name!.toLowerCase(),
      );
      if (!parent) return null;

      const newDepth = parent.depth + 1;
      if (newDepth > 5) return null;

      const { data: newNode, error: insertError } = await supabase
        .from("skill_nodes")
        .insert({
          name: llmResult.name,
          parent_id: parent.id,
          depth: newDepth,
          is_leaf: true,
          aliases: llmResult.aliases ?? [],
          created_by: "llm",
        })
        .select("id, name")
        .single();

      if (insertError || !newNode) return null;

      if (parent.is_leaf) {
        await supabase
          .from("skill_nodes")
          .update({ is_leaf: false })
          .eq("id", parent.id);
      }

      return { nodeId: newNode.id, name: newNode.name, created: true };
    }
  } catch {
    // LLM not available or failed — return null
    return null;
  }

  return null;
}

function buildTreeText(
  nodes: Array<{
    id: string;
    name: string;
    parent_id: string | null;
    depth: number;
    is_leaf: boolean;
  }>,
): string {
  const lines: string[] = [];
  const childMap = new Map<string | null, typeof nodes>();

  for (const node of nodes) {
    const parentKey = node.parent_id ?? "__root__";
    const children = childMap.get(parentKey) ?? [];
    children.push(node);
    childMap.set(parentKey, children);
  }

  function renderNode(id: string | null, indent: number) {
    const key = id ?? "__root__";
    const children = childMap.get(key) ?? [];
    for (const child of children) {
      const prefix = "  ".repeat(indent);
      const leafMark = child.is_leaf ? "" : " *";
      lines.push(`${prefix}- ${child.name}${leafMark}`);
      renderNode(child.id, indent + 1);
    }
  }

  renderNode(null, 0);
  return lines.join("\n");
}
