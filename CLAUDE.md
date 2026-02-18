## CRITICAL — Read Before Any Task

1. **Read `.AGENTS.md` first.** Before writing or modifying any code, read `.AGENTS.md` in full. It contains workflow rules, conventions, and the testing checklist you must follow.
2. **Never commit code directly to `dev` or `main`.** Always create a feature/fix branch. Use a **git worktree** branched off `dev` for all code work (unless you are in the web environment). Documentation-only changes on `dev` are fine.
3. **Plan mode first step**: When writing a plan (via `EnterPlanMode`), always include as the **first step**: create a git worktree and `cd` into it. Plan mode cannot run commands, so this ensures the worktree setup isn't forgotten when implementation begins.
4. See `spec/` for product specifications.

## Bash Tool Rules

To avoid permission prompts from compound commands:

- **Never chain commands with `&&`, `||`, or `;`** — make separate sequential Bash tool calls instead
- **Never use `for`/`while` loops or process substitution `<()`** in Bash — use dedicated tools (Grep, Glob, Read) or multiple sequential calls
- **Never pipe commands** (`|`) — use dedicated tools or capture output across calls
- One simple command per Bash tool call. This is more transparent and avoids permission issues.
