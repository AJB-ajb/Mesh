import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * POST /api/skills/normalize
 *
 * Normalizes a user-typed skill string to a tree node.
 * 1. Exact name match (case-insensitive) → return existing node
 * 2. Alias match → return existing node
 * 3. LLM auto-adding → create new node or map to existing
 */

const llmResponseSchema: Schema = {
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
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401);
  }

  const body = await request.json();
  const skill = (body.skill as string)?.trim();

  if (!skill || skill.length < 1) {
    return apiError("VALIDATION", "Skill string is required", 400);
  }

  // Step 1: Check exact name match (case-insensitive)
  const { data: nameMatch } = await supabase
    .from("skill_nodes")
    .select("id, name, is_leaf, depth, parent_id")
    .ilike("name", skill)
    .limit(1)
    .maybeSingle();

  if (nameMatch) {
    const path = await buildNodePath(supabase, nameMatch);
    return apiSuccess({
      node: {
        id: nameMatch.id,
        name: nameMatch.name,
        path,
        isLeaf: nameMatch.is_leaf,
        depth: nameMatch.depth,
      },
      created: false,
    });
  }

  // Step 2: Check alias match using the GIN index (skill_nodes_aliases_idx)
  // .contains() translates to the @> operator which uses the GIN index,
  // avoiding a full-table scan.
  const { data: aliasMatch } = await supabase
    .from("skill_nodes")
    .select("id, name, is_leaf, depth, parent_id")
    .contains("aliases", [skill])
    .maybeSingle();

  if (aliasMatch) {
    const path = await buildNodePath(supabase, aliasMatch);
    return apiSuccess({
      node: {
        id: aliasMatch.id,
        name: aliasMatch.name,
        path,
        isLeaf: aliasMatch.is_leaf,
        depth: aliasMatch.depth,
      },
      created: false,
    });
  }

  // Step 3: LLM auto-adding
  if (!isGeminiConfigured()) {
    return apiError(
      "INTERNAL",
      "Gemini API key not configured — cannot auto-add skills",
      503,
    );
  }

  // Fetch the tree for context
  const { data: allNodes } = await supabase
    .from("skill_nodes")
    .select("id, name, parent_id, depth, is_leaf")
    .order("depth")
    .order("name");

  if (!allNodes) {
    return apiError("INTERNAL", "Failed to load skill tree", 500);
  }

  // Build a compact tree representation for the LLM
  const treeText = buildTreeText(allNodes);

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
    userPrompt: `Skill to classify: "${skill}"

Current skill tree:
${treeText}`,
    schema: llmResponseSchema,
    temperature: 0.2,
  });

  if (llmResult.action === "map" && llmResult.existing_node_name) {
    // Find the existing node
    const mapped = allNodes.find(
      (n) =>
        n.name.toLowerCase() === llmResult.existing_node_name!.toLowerCase(),
    );
    if (mapped) {
      // Add the user's input as an alias for future matches
      const { data: fullNode } = await supabase
        .from("skill_nodes")
        .select("aliases")
        .eq("id", mapped.id)
        .single();

      if (fullNode) {
        const currentAliases = (fullNode.aliases as string[]) ?? [];
        if (
          !currentAliases.some(
            (a) => a.toLowerCase() === skill.toLowerCase(),
          ) &&
          mapped.name.toLowerCase() !== skill.toLowerCase()
        ) {
          await supabase
            .from("skill_nodes")
            .update({ aliases: [...currentAliases, skill] })
            .eq("id", mapped.id);
        }
      }

      const path = await buildNodePath(supabase, mapped);
      return apiSuccess({
        node: {
          id: mapped.id,
          name: mapped.name,
          path,
          isLeaf: mapped.is_leaf,
          depth: mapped.depth,
        },
        created: false,
      });
    }
  }

  if (llmResult.action === "add" && llmResult.name && llmResult.parent_name) {
    // Find parent
    const parent = allNodes.find(
      (n) => n.name.toLowerCase() === llmResult.parent_name!.toLowerCase(),
    );

    if (!parent) {
      return apiError(
        "VALIDATION",
        `Parent node "${llmResult.parent_name}" not found in tree`,
        400,
      );
    }

    const newDepth = parent.depth + 1;
    if (newDepth > 5) {
      return apiError(
        "VALIDATION",
        "Maximum tree depth (5) would be exceeded",
        400,
      );
    }

    // Insert new node
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
      .select("id, name, is_leaf, depth, parent_id")
      .single();

    if (insertError) {
      return apiError("INTERNAL", insertError.message, 500);
    }

    // Mark parent as non-leaf if it was a leaf
    if (parent.is_leaf) {
      await supabase
        .from("skill_nodes")
        .update({ is_leaf: false })
        .eq("id", parent.id);
    }

    const path = await buildNodePath(supabase, newNode);
    return apiSuccess({
      node: {
        id: newNode.id,
        name: newNode.name,
        path,
        isLeaf: newNode.is_leaf,
        depth: newNode.depth,
      },
      created: true,
    });
  }

  return apiError("VALIDATION", "LLM could not classify this skill", 400);
}

async function buildNodePath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  node: { id: string; parent_id: string | null },
): Promise<string[]> {
  const path: string[] = [];
  if (!node.parent_id) return path;

  const { data: allNodes } = await supabase
    .from("skill_nodes")
    .select("id, name, parent_id");

  if (!allNodes) return path;

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  let current = node.parent_id ? nodeMap.get(node.parent_id) : undefined;
  while (current) {
    path.unshift(current.name);
    current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
  }
  return path;
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
