# Prompts

This directory contains prompt files for AI agents. Writing prompts in files is easier than writing them in the agent window, and allows iteration on the prompts themselves.

## Structure

- `features.md` - Feature ideas and brainstorming
- `archived/` - Old or completed prompts

## Usage

The directory itself is tracked in git, but file contents are gitignored (`.prompts/*` in `.gitignore`). Only this `Prompts.md` file is committed.

## Example workflows

- Write a prompt to update the spec with a new vision, then let an agent update and clean the spec for consistency.
- Draft a feature spec as a prompt, iterate on it, then hand it off to an agent for implementation.
- Keep bug reproduction notes as prompts for debugging sessions.
