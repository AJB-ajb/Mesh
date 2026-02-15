# UX Spec

## Design Principles

1. **Minimal friction** — no required configuration, one-click OAuth, 30-second onboarding (see below)
2. **Fast, simple, efficient usage**
   - **Keyboard-first:** forms are navigable and completable via keyboard (Tab, Enter, shortcuts)
   - **Free-form first:** the default input is a single free-form text or voice field; reference fields and guiding questions are shown alongside as a helpful scaffold, but not required
3. **Idea-first** — start from what you want to do, not from building a profile
4. **Natural language interface** — voice and text input, AI extracts structured data
5. **Good enough matching** — cover common cases well; better than random, not perfect
6. **High responsiveness** — postings should feel fresh and active; instant notifications for time-critical items

## Pages & Navigation

### Routes

| Page                 | Route                   | Description                                         |
| -------------------- | ----------------------- | --------------------------------------------------- |
| Landing              | `/`                     | Hero, features, CTA                                 |
| Login                | `/login`                | Email/password + OAuth (Google, GitHub, LinkedIn)   |
| Sign up              | `/signup`               | Registration                                        |
| Forgot password      | `/forgot-password`      | Recovery email                                      |
| Reset password       | `/reset-password`       | Reset form                                          |
| Onboarding           | `/onboarding`           | Persona selection (developer / posting creator)     |
| Onboarding — profile | `/onboarding/developer` | Voice/text profile setup                            |
| Dashboard            | `/dashboard`            | Stats, activity, recommendations (persona-specific) |
| Browse postings      | `/postings`             | Discover + My Postings tabs                         |
| Create posting       | `/postings/new`         | Free-form input + AI extraction                     |
| Posting detail       | `/postings/[id]`        | Detail view, join / request to join, edit           |
| Matches              | `/matches`              | AI-recommended postings with compatibility scores   |
| Bookmarks            | `/bookmarks`            | Saved postings for later review                     |
| Inbox                | `/inbox`                | Notifications + Messages tabs                       |
| Profile              | `/profile`              | User profile                                        |
| Settings             | `/settings`             | User settings                                       |

### Navigation structure

- **Sidebar main:** Dashboard, Postings, Matches, Bookmarks, Inbox
- **Sidebar secondary:** Profile, Settings
- **Sidebar CTA:** New Posting button
- **Header:** Global search, theme toggle, notifications bell, user menu

## Onboarding Flow

Target: a not-yet-registered user with a written project description can post in **under 30 seconds**.

1. Click "Post project" CTA on landing page
2. OAuth login (Google, GitHub, LinkedIn — one click)
3. Paste project description into free-form field
4. Post

Personal profile configuration is **not required** to create a posting. It can be completed later to improve matching quality. See [vision.md](vision.md) for the product reasoning behind this.

## Interaction Patterns

- **Persona-driven views:** developer vs posting creator see different dashboards, stats, and quick actions
- **AI compatibility scores** shown prominently on posting cards (relevance, availability, skill, location breakdown)
- **Real-time messaging** with typing indicators and presence status
- **Progressive disclosure:** empty states guide the user to their next action
- `[planned]` **Sequential Invite:** ordered invite flow — rank connections by preference, send invites one-by-one until enough accept
- `[planned]` **Voice input** for posting creation and natural language filtering
- `[planned]` **AI-generated daily digest** notifications
- `[planned]` **Markdown-first interface**: Markdown input/output for postings, conversations, and configuration. Copy posting as markdown. Auto-clean/format options. Handoff document export (full context including platform metadata).
