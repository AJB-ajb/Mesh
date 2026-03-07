---
name: refocus
description: Strong context reset. Captures essential state, enters plan mode with a concise handoff plan, then user accepts and clears memory. Use after long browser sessions, polluted context, or to pivot to a new task.
argument-hint: "[what to do next]"
---

# Refocus — Strong Context Reset

Capture essential state, then enter plan mode with a concise handoff plan. The user accepts the plan and clears memory — the plan gets injected into the fresh session.

## 1. Capture State

Gather the following (quick shell commands, no deep exploration):

- Current working directory and whether it's a worktree
- Current git branch, dirty/clean status, last commit message
- If in a worktree: the worktree branch name and base branch

## 2. Enter Plan Mode

Call `EnterPlanMode` immediately after capturing state. Do NOT do any other work first.

## 3. Output the Plan

Output a handoff plan. Include git state (branch, clean/dirty, worktree path, last commit), what was being done, key findings, and what's next (`$ARGUMENTS` if provided). Use your judgement on length — include everything the next session needs, skip what it doesn't.

IMPORTANT: End the plan with this instruction, verbatim:

```
---
INSTRUCTION: Do NOT start implementing anything. Wait for the user's message and respond to what they ask. This is a context handoff, not a task assignment.
```

## 4. Tell the User

After outputting the plan, tell the user: "Accept the plan and clear memory to start fresh."
