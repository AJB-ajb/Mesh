---
name: agents-md
description: >
  Edit .AGENTS.md or CLAUDE.md project instructions. Ensures changes are concise, non-duplicative,
  and token-efficient. IMPORTANT: Trigger this skill whenever you are about to edit .AGENTS.md or
  CLAUDE.md — even if the edit arises as part of a different task (e.g. adding a worktree step
  during a permissions update). Also trigger when someone says 'update agents', 'add to claude.md',
  'change the rules', 'add a convention', or 'modify agent instructions'.
argument-hint: "[what to add or change]"
---

# Editing .AGENTS.md / CLAUDE.md

These files are loaded into every Claude Code session. Every line costs tokens across all sessions, so ruthlessly minimize bloat.

## Principles

1. **One line per rule when possible.** If a rule needs a table or list, it earns its space only if the alternative is ambiguity.
2. **Reference, don't inline.** Large mappings, lookup tables, and examples belong in separate files (e.g. `tests/e2e-map.md`, `docs/conventions.md`). Add a one-liner pointing to the file.
3. **No duplication.** Before adding, search both files and `docs/` for existing coverage. Update in place rather than adding a second entry.
4. **Conditional context belongs in skills.** If guidance only applies during specific tasks (e.g. release, triage, debugging), put it in a skill, not in `.AGENTS.md`.
5. **Audience is the LLM agent.** Write for fast parsing: imperative sentences, no filler, no motivation paragraphs. The agent doesn't need to be convinced — it needs to know what to do.

## Before editing

1. Read the target file fully — understand existing structure and sections.
2. Search for related content: `Grep pattern="<keyword>" path=".AGENTS.md"` and `CLAUDE.md`.
3. Decide: update existing text, or add new? Prefer updating.

## File roles

| File         | Purpose                                        | Scope                                   |
| ------------ | ---------------------------------------------- | --------------------------------------- |
| `CLAUDE.md`  | User-level overrides, project-level pointers   | Minimal — mostly points to `.AGENTS.md` |
| `.AGENTS.md` | All agent conventions, workflow, and checklist | Checked into repo, shared across team   |

## When adding a new convention

- Add it to the most relevant existing section (don't create new sections lightly).
- Keep it to 1-2 lines. If it needs more, extract detail to a reference file and link it.
- If it only matters for a specific workflow, consider a skill instead.

## When removing or updating

- Delete cleanly — no "removed" comments or backwards-compat shims.
- If a convention moved to a skill, remove it from `.AGENTS.md` entirely.
