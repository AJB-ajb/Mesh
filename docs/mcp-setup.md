# MCP Server Configuration for MeshIt

This document describes the Model Context Protocol (MCP) servers configured for the MeshIt project.

## Overview

MCP enables Cursor IDE to connect to external tools and data sources. This project uses the following MCP servers:

| Server     | Type                     | Purpose                                   |
| ---------- | ------------------------ | ----------------------------------------- |
| GitHub     | STDIO (local)            | Repository management, issues, PRs        |
| Playwright | STDIO (local)            | Browser automation and testing            |
| Sentry     | Remote (HTTP)            | Error tracking and monitoring             |
| PostHog    | Remote (HTTP)            | Product analytics and feature flags       |
| Supabase   | Remote (HTTP)            | Database, auth, and backend services      |
| ElevenLabs | STDIO (local)            | Voice TTS for match explanations          |
| n8n-mcp    | Remote (supergateway)    | Automation workflows (daily digest, sync) |
| Discord    | Docker (local container) | Community bot workflows                   |

## Configuration Files

### Project-Level MCP Config

Location: `.cursor/mcp.json`

This file configures MCP servers specifically for this project. It's already in `.gitignore`.

### Environment Variables

Location: `.env`

Contains all API keys and tokens. **Never commit this file.**

A template is provided at `.env.example` for reference.

## Setup Instructions

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure Each Service

#### GitHub

1. Go to https://github.com/settings/tokens
2. Generate a new token (classic) with scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org membership)
   - `read:user` (Read user profile data)
3. Add to `.env`:
   ```
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
   ```

#### Supabase

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the values to `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### Sentry

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new auth token
3. Add to `.env`:
   ```
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=meshit
   ```

#### PostHog

1. Go to https://app.posthog.com/project/settings
2. Copy your API key
3. Add to `.env`:
   ```
   POSTHOG_API_KEY=phc_xxxxxxxxxxxx
   POSTHOG_HOST=https://app.posthog.com
   ```
   Note: Use `https://eu.posthog.com` if on EU cloud.

#### n8n-mcp

1. Log in to your n8n Cloud workspace (or self-host) and open **Settings → API**.
2. Create a JWT API key with workflow read/execute permissions.
3. Copy your MCP endpoint URL (for Cloud this is usually `https://<workspace>.n8n.cloud/mcp-server/http`).
4. Add to `.env`:
   ```
   N8N_API_URL=https://your-workspace.n8n.cloud/mcp-server/http
   N8N_API_KEY=xxxxxxxxxxxxxxxx
   ```
5. Ensure `.cursor/mcp.json` contains the `n8n-mcp` entry:
   ```
   "n8n-mcp": {
     "command": "npx",
     "args": [
       "-y",
       "supergateway",
       "--streamableHttp",
       "${env:N8N_API_URL}",
       "--header",
       "authorization:Bearer ${env:N8N_API_KEY}"
     ]
   }
   ```
6. Restart Cursor so the n8n MCP server picks up the new configuration.

#### Playwright

No configuration needed - runs locally without credentials.

### 3. Restart Cursor

After configuring `.env`, restart Cursor IDE to load the MCP servers.

### 4. Authenticate OAuth Servers

When you first use Sentry, PostHog, or Supabase MCP tools, you'll be prompted to authenticate via OAuth in your browser.

## Troubleshooting

- **MCP server not connecting**: Check `.env` exists with correct values, restart IDE, check Settings > MCP for server status
- **GitHub token issues**: Ensure token has required scopes, regenerate if expired
- **OAuth failed**: Clear browser cookies, try incognito, check org/project access

## Security Notes

- Never commit `.env` (it's in `.gitignore`)
- Use minimal scopes — only grant permissions needed
- Rotate tokens regularly
