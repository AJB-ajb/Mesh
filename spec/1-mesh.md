# Mesh

> Platform for effective activity coordination in small groups — finding the right people for projects, activities, and spontaneous plans.

## Problem

Activity coordination through messaging apps requires excessive back-and-forth because messaging apps treat everything as a message. They don't understand the structure of an activity (who, when, where, what, how many), so they can't help resolve it. Mesh substitutes each negotiation dimension with an intelligent mechanism. See [0-vision.md](0-vision.md) for the full philosophy.

## Approach

- **Activity-first**: start with what you want to do, then find people
- **Fast setup**: post in 30 seconds, no profile required
- **Natural language**: describe your activity like you would in a chat message; AI extracts structure
- **Text-first**: structure is derived from text, not inputted through forms. See [1-text-first.md](1-text-first.md)

## Scope

- Primary: small groups (2-5 people), especially pairs
- Projects, activities, and social plans are all first-class posting types
- Don't artificially limit applicability

## Key Issues

- Adoption, fast usability
- High responsiveness — postings should be fresh and active

## Core Features

- Text-first posting (paste from Slack/WhatsApp, AI extracts features)
- AI matching: fast filter + deep LLM evaluation. See [1-matching.md](1-matching.md)
- Sequential and parallel invites for connections
- One-click OAuth login, no setup required
- Nested postings for groups, channels, recurring activities. See [1-nested-postings.md](1-nested-postings.md)
- Notifications: in-app bell + daily digest + push (planned)

## Monetization

LLM invocations are a real cost. Tiered access keeps the product viable.

- **Free tier**: full posting, fast-filter matching, deep match for top N matches, standard LLM model
- **Premium**: unlimited deep matching, full match explanations, priority placement, LLM-assisted logistics
- **LLM cost tiering**: cheap models for ghost text/chips, mid-tier for extraction/formatting, high-tier for deep matching

## Competitors

- Meetup.com, Facebook groups: focus on large groups, high friction
- Messaging apps (WhatsApp, Slack): no activity structure, coordination is manual

## Spec Index

See [README.md](README.md) for the full spec directory structure and loading guidance.
