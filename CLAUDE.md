## CRITICAL — Read Before Any Task

1. **Read `.AGENTS.md` first.** Before writing or modifying any code, read `.AGENTS.md` in full. It contains workflow rules, conventions, and the testing checklist you must follow.
2. **Follow the Git Workflow in `.AGENTS.md`**: Never commit code directly to `dev` or `main`. Use git worktrees as described there.
3. **Worktree trigger — first edit rule**: Before making the first file edit (Edit/Write tool) to any source or config file, check if you are in the main repo on `dev`/`main`. If so, **stop and create a worktree first** — even if the conversation started as investigation and evolved into code changes. The only exception is documentation-only changes (`spec/`, `docs/`, `*.md`).
4. **Plan mode first step**: When writing a plan (via `EnterPlanMode`), always include as the **first step**: create a git worktree and `cd` into it. Plan mode cannot run commands, so this ensures the worktree setup isn't forgotten when implementation begins.
5. See `spec/README.md` for the layered spec directory (0-direction, 1-behavior, 2-roadmap, 3-architecture). Read `spec/README.md` first to know which files to load.

## Parallel Subagents

For larger features, prefer splitting independent work into parallel subagent sessions (via the `Task` tool) when it gives a significant total advantage — e.g. cutting wall-clock time or keeping the main context focused. Use `isolation: "worktree"` when the subagent needs to write code (gives it its own branch and working copy); skip isolation for read-only research or exploration. Don't parallelise for the sake of it — only when the tasks are genuinely independent and the overhead is worth it.

When subagents produce separate branches, merge them into the session's main worktree branch before landing — don't land each one individually. See "Consolidating subagent branches" in `.AGENTS.md`.

## Worktree Locations

Two worktree approaches coexist — use the right one for the context:

| Approach                 | Location                   | When to use                                                                                                               |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Sibling worktree**     | `../Mesh-<branch-name>`    | Feature branches, any work you (the main session) do. Visible in file manager, easy to open in IDE, what `/land` expects. |
| **`.claude/worktrees/`** | `.claude/worktrees/<name>` | Subagent `isolation: "worktree"` sessions only. Throwaway, auto-cleaned.                                                  |

**Sibling worktree setup** (for feature work):

```bash
git worktree add ../Mesh-<branch-name> -b <branch-name> dev
ln -s /home/ajb/repos/Mesh/.env ../Mesh-<branch-name>/.env
cd ../Mesh-<branch-name>
```

## Supabase Gotchas

- **`supabase db push` to production fails with wrong password**: `.env` sets `SUPABASE_DB_PASSWORD` to the **dev** DB password. The CLI auto-reads this and sends it to whichever host you're linked to. When linked to production, it sends the dev password → auth failure. Fix: unset it so the CLI uses stored credentials from `supabase link`:
  ```
  SUPABASE_DB_PASSWORD= supabase db push
  ```
- **Use `supabase` not `npx supabase`**: Both resolve to the same version, but `npx` adds overhead and can behave differently with interactive prompts.
- **pgTAP `supabase test db`**: The dev DB password contains `$` and `!` which bash interprets. Use Python `subprocess` to bypass shell escaping (see release skill for details).

## End-of-Session Hygiene

Before ending a session where files were modified, check `git status`. If there are uncommitted changes, ask the user whether to commit them. Do not leave modified files uncommitted without the user's awareness.
