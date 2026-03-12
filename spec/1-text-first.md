# Text-First

> Text is the primary input for postings and profiles. Structure is derived from text, not inputted through forms.

## Why Text-First

### The Problem With Forms

Structured forms (title, description, category, skill picker, location, time, team size) have three problems:

1. **Slow.** A posting that takes 10 seconds to describe in a message takes 2+ minutes through a form. This kills spontaneous use cases.
2. **Can't capture what matters.** "Someone who can hold a conversation about ML safety, not just recite papers" doesn't fit in dropdowns or skill-level sliders.
3. **Fragments truth.** Text says one thing, structured fields say another. The system has to decide which to trust.

### Why Text Works

- **Users already know how.** People coordinate through text every day (WhatsApp, Slack, email).
- **Text captures nuance.** "Python (able to scrape a website in 10 minutes)" says more than "Python: Intermediate."
- **LLMs are good at text.** Extraction improves over time; betting on text means betting on an improving capability.
- **Text is portable.** A markdown posting can be copy-pasted to Slack, Discord, email. Form data can't.

### What Changes

| Aspect               | Form-First                    | Text-First                                                 |
| -------------------- | ----------------------------- | ---------------------------------------------------------- |
| **Primary input**    | Multi-step form               | Single text field                                          |
| **Text**             | Secondary description field   | The posting _is_ the text                                  |
| **Structured data**  | User enters via form fields   | Auto-extracted from text in background                     |
| **Skills**           | Skill tree picker with levels | Free text, extracted to skill tags                         |
| **Profile creation** | Fill out form fields          | Write/paste a description, or guided prompts               |
| **Matching basis**   | Structured field comparison   | Fast filter on extracted data, then LLM deep match on text |

---

## Data Model: Text + Metadata

### Two Kinds of Data

Every posting and profile has:

1. **Text** (markdown) -- the user's description. Appears in the posting, used for deep matching, is the user's primary artifact.
2. **Metadata** -- structured data that is _either extracted from text_ or _set independently_ because it doesn't belong in text (calendar availability, GPS coordinates, visibility settings, invitations).

### The Principle

> The markdown text is the primary data store. Structured data lives in the text via `mesh:` links when precision is needed, or as plain text when not. A small set of truly non-textual metadata (calendar imports, visibility settings, invitations) lives separately. LLM extraction derives queryable fields from the text for fast filtering.

| Data type                 | Lives in...                          | Example                                                                             |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------ | --- | --------- | --- | --- | ----------------------- | --- | --- |
| What the posting is about | Text (plain)                         | "Looking for someone to practice negotiation, ~2h/week"                             |
| Skills mentioned          | Text (plain or `mesh:skill` link)    | `[negotiation (beginner)](mesh:skill?id=negotiation&level=1)` or just "negotiation" |
| Activity type             | Extracted from text by LLM           | `practice_session`                                                                  |
| Time preference           | Text (plain or `mesh:time` link)     | `[evenings, ~2h/week](mesh:time?times=evening)` or just "evenings"                  |
| Precise location          | Text (`mesh:location` link or plain) | `[near Karlsplatz](mesh:location?lat=48.13&lng=11.58&r=2)`                          |
| Hidden details            | Text (`                              |                                                                                     | hidden |     | ` syntax) | `   |     | Karlsplatz 5, 3rd floor |     | `   |
| Calendar availability     | Metadata (imported)                  | Free/busy slots                                                                     |
| Visibility                | Metadata (user setting)              | `public` / `private`                                                                |
| Invitations               | Metadata (action)                    | `[user_id_1, user_id_2]`                                                            |
| Group size                | Text (plain or extracted)            | `2-3`                                                                               |

### Extraction, Not Standardization

When the user posts, the LLM extracts metadata from text in the background. This is a **read-only derivation** -- the LLM extracts data for querying and filtering, but does not modify the user's text.

Why not auto-standardize?

- Users don't want their words rewritten without consent.
- Bidirectional sync (metadata <-> text) is expensive and fragile.
- Read-only extraction is simpler -- mistakes in metadata affect filtering, not the posting itself.

If extraction is clearly wrong, the user can correct metadata directly, and that correction feeds back into improving extraction.

### Keeping the Skill System

The global skill taxonomy remains for fast filtering. But instead of users manually navigating a skill tree:

1. Skills are **extracted from text** by the LLM, mapped to the nearest taxonomy entry.
2. Optionally **set manually** via `/skills` or the skill picker.
3. **Augmented over time** -- frequently-appearing skills not in the taxonomy get flagged for addition.

---

## Text Format: Lightweight Markdown

### Why Markdown

- It _is_ plain text -- users can type it like a message.
- It _renders_ with lightweight structure -- bold, lists, headings.
- LLMs natively produce it -- zero conversion needed.
- It's portable -- copy-paste to Slack, Discord, GitHub, email works.

### The Dialect

Chat-friendly subset (not full markdown):

| Syntax                     | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `**bold**`                 | Emphasis                                   |
| `- `                       | Bullet lists                               |
| `## `                      | Headings (ATX only -- no `===` underlines) |
| `` `code` ``               | Inline code / technical terms              |
| `[text](url)`              | URLs                                       |
| `[text](mesh:type?params)` | Metadata-linked text (see below)           |
| `\|\|hidden content\|\|`   | Acceptance-gated content (see below)       |
| Single newline             | Line break (like messaging apps)           |

Excluded: tables, images, horizontal rules, HTML, footnotes.

### Rendering Modes

- **Edit mode**: Syntax-highlighted markdown -- `**text**` styled bold but `**` markers remain visible. What you type is what's stored.
- **View mode**: Fully rendered markdown. Clean and readable.
- **Messaging**: Inline markdown rendered (bold, italic, code, links). Conversational, not document-like.

---

## Mesh Link Syntax (`mesh:`)

Structured data embedded in text using standard markdown link syntax with a `mesh:` scheme. **Optional** -- plain text is always fine; link syntax gives precision when the user wants it.

**Format**: `[display text](mesh:type?key=value&key=value)`

**Examples**:

```markdown
[near Karlsplatz, Munich](mesh:location?lat=48.13&lng=11.58&r=2)
[weekday evenings 18-20](mesh:time?days=mon,tue,wed,thu,fri&from=18:00&to=20:00)
[Spanish (conversational)](mesh:skill?id=spanish&name=Spanish&level=3)
```

### Three Layers of Input

All produce the same result for matching:

1. **Plain text** (default): User writes naturally. LLM extracts metadata.
2. **Link syntax** (precision): Slash commands insert these. Machine-readable, deterministically parsable.
3. **Both**: Plain text + link syntax for key details. They coexist.

### Extraction Philosophy

Text is the reference. `mesh:` link syntax provides deterministic extraction for precision; the LLM adds additional metadata from surrounding plain text. Two extraction paths coexist:

- **Deterministic**: `mesh:` links are regex-parsable. Always accurate.
- **LLM-based**: Free text is interpreted by the LLM. Best-effort, improving over time.

Form fields are deprecated in favor of text input. The LLM and `mesh:` syntax together cover the full range from casual to precise.

### Design Rules

- The markdown **is** the data. No separate metadata sidecar.
- Link syntax is valid markdown everywhere. Copy-paste gives readable (if verbose) output.
- The editor renders `mesh:` links as styled tappable chips. Tapping re-opens the relevant picker.
- The editor hides the URL portion in normal editing. Raw markdown is always accessible.

---

## Hidden Content (`||...||`)

Content wrapped in `||` is hidden from public view and revealed only after acceptance. Replaces manual "send me the details" messaging.

### Passive Hidden Content

**Inline**: `Meet near ||Karlsplatz 5, 3rd floor, ring 'Schmidt'||`

**Block** (`||` on its own line):

```markdown
||
Exact address: Karlsplatz 5, 3rd floor
Zoom: https://zoom.us/j/123456
Door code: 4521
||
```

Rule: if each `||` is alone on its own line, it's a block. Otherwise inline.

### Interactive Hidden Content (`||?...||`)

Hidden prompts that become interactive UI on acceptance. The poster writes natural-language questions; the LLM converts them to appropriate form elements at render time.

```markdown
||?
What instrument do you play?
Do you have your own equipment?
What's your experience level with jazz?
||
```

On acceptance, the LLM generates: instrument selector, equipment yes/no, jazz level selector. No form DSL -- the poster writes questions in plain text, the LLM decides the UI.

### Rendering

| Context                 | `                                 |                                 | hidden              |     | `   | `                    |     | ? prompts |     | `   |
| ----------------------- | --------------------------------- | ------------------------------- | ------------------- | --- | --- | -------------------- | --- | --------- | --- | --- |
| **Editor**              | Dimmed, lock icon                 | Dimmed, question icon           |
| **View (not accepted)** | "Details shared after acceptance" | "Questions asked on acceptance" |
| **View (accepted)**     | Revealed as normal text           | Revealed as filled-in responses |
| **Copy-paste / export** | `                                 |                                 | ` markers preserved | `   |     | ?` markers preserved |

### Combining With `mesh:` Links

A location can show the area publicly, with exact details hidden:

```markdown
[near Karlsplatz, Munich](mesh:location?lat=48.13&lng=11.58&r=2)
||Exact: Karlsplatz 5, 3rd floor, ring 'Schmidt'||
```

---

## Matching Changes

Text-first changes matching from a purely structured approach to a **two-stage hybrid**. Amends [1-matching.md](1-matching.md).

### Stage 1: Fast Filter (unchanged in principle)

Uses extracted metadata for SQL/pgvector queries:

- Activity type, category, parent posting context
- Location proximity (distance filter on coordinates)
- Time overlap (calendar + extracted time preferences)
- Skill overlap (extracted skills matched against taxonomy)
- pgvector cosine similarity on posting/profile text embeddings

Same approach as before, but inputs are now _derived from text_ rather than manually entered.

### Stage 2: Deep Match (new)

For top candidates from Stage 1 (~10-20 per posting), an LLM evaluates full text of both sides.

**Input**: poster's full text, candidate's full profile text, fast-filter overlap summary, calendar overlap data.

**Output**: match quality score (0-1), brief explanation, any concerns or caveats.

Enables matching on dimensions structured data can't capture: communication style, project approach, nuanced skill descriptions, complementary experience.

### Multi-Role Postings

A posting can describe multiple roles ("Looking for an actor AND a musician"). The LLM identifies distinct roles and matches candidates against each role separately.

---

## Non-Text Signals

Some information is inherently non-textual. Handled as metadata alongside text:

| Signal                    | How it works                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Calendar availability** | Imported from Google/iCal. Used for time overlap in fast filter and as context to deep match LLM. |
| **Precise location**      | Set via map/GPS. Stored as coordinates for distance filtering. Displayed as human-readable label. |
| **Verification badges**   | Linked LinkedIn/GitHub profiles. Displayed as visual badges, not part of text.                    |
| **Collaboration metrics** | Collaboration count, completed projects, match history. Profile metadata.                         |
| **Language preferences**  | Set in user settings. Used for matching and auto-translation.                                     |

---

## Data Philosophy

Mesh does not use end-to-end encryption for posting/profile content, because LLM integration requires server-side access to text. The app establishes a different communication norm: user-generated text is processed by the platform to provide matching, extraction, and coordination features. Standard encryption is used for transport and private user data, but content is processed server-side.

---

## What Stays the Same

The text-first design changes the _input paradigm and matching approach_. The coordination core is unaffected:

- **Posting -> invite -> coordinate flow**: The core loop. Text-first makes _creating_ the posting faster; coordination after posting is unchanged.
- **Page structure**: Spaces, Activity, Profile (see [1-ux.md](1-ux.md))
- **Posting lifecycle**: draft -> open -> active (min team reached) -> closed
- **Waitlist**: Automatic waitlisting when postings are filled
- **Connections & messaging**: Real-time messaging within Spaces (DMs and group conversations)
- **Notifications**: Activity tab for actionable items, badges on Spaces for messages
- **OAuth & onboarding**: One-click login, 30-second onboarding target
- **Verification**: LinkedIn/GitHub profile linking and badges

---

## Current Deviations

Features specified above but not yet implemented:

- **`mesh:` link syntax**: Editor and renderer do not yet support `mesh:type?params` links or chip rendering. Skills, locations, and times are still extracted purely via LLM.
- **`||hidden||` syntax**: Acceptance-gated content is not yet implemented. Post-accept details are shared manually via messaging.
- **`||?||` interactive prompts**: LLM-generated acceptance forms are not yet implemented.
- **Deep match (Stage 2)**: LLM-based deep matching on full text is implemented but multi-role matching is not.
- **Unified PostingCard**: Multiple card components exist; not yet consolidated into a single `full`/`compact` variant component.
