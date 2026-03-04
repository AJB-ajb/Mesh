import type { PaletteAction } from "./actions";

/**
 * Filter actions by matching query as a substring against label + keywords.
 * Returns all actions when query is empty.
 */
export function filterActions(
  actions: PaletteAction[],
  query: string,
): PaletteAction[] {
  const q = query.toLowerCase().trim();
  if (!q) return actions;

  return actions.filter((action) => {
    if (action.label.toLowerCase().includes(q)) return true;
    return action.keywords.some((kw) => kw.includes(q));
  });
}
