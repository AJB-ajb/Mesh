See `.AGENTS.md` for agent workflow rules and dev reference.
See `spec/` for product specifications.

## Bash Tool Rules

To avoid permission prompts from compound commands:

- **Never chain commands with `&&`, `||`, or `;`** — make separate sequential Bash tool calls instead
- **Never use `for`/`while` loops or process substitution `<()`** in Bash — use dedicated tools (Grep, Glob, Read) or multiple sequential calls
- **Never pipe commands** (`|`) — use dedicated tools or capture output across calls
- One simple command per Bash tool call. This is more transparent and avoids permission issues.
