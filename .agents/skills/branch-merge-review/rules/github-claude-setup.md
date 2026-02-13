# github-claude-setup

**Category**: Setup | **Severity**: N/A (one-time)

## Overview

Claude GitHub integration enables automated PR review and @claude mentions in issues/PRs. Workflow file: `.github/workflows/claude.yml`.

## Setup Steps

### 1. Install the Claude GitHub App

Visit https://github.com/apps/claude and install on the MeshIt repository.

Permissions needed:

- Contents: Read & write
- Issues: Read & write
- Pull requests: Read & write

### 2. Add API Key Secret

Go to repository Settings > Secrets and variables > Actions.
Add secret: `ANTHROPIC_API_KEY` with your Anthropic API key.

### 3. Test

Open a PR or comment `@claude what does this PR do?` on any issue/PR.

## What the Workflow Does

**On PR open/update** (`pull_request: opened, synchronize`):

- Auto-reviews the PR focusing on correctness, integration, Supabase patterns, and test coverage
- Uses CLAUDE.md for project-specific conventions

**On @claude mention** (`issue_comment`, `pull_request_review_comment`):

- Responds to the mention with context-aware answers
- Can implement changes, explain code, or review specific aspects

## Configuration

Behavior is controlled by:

1. `CLAUDE.md` at repo root — project conventions and rules
2. `.agents/skills/` — best practices skills that Claude can reference
3. `prompt` in the workflow — specific review instructions

## Cost Notes

Each review/interaction consumes Anthropic API tokens. The workflow uses `--max-turns 5` to limit cost per review. Monitor usage at https://console.anthropic.com.
