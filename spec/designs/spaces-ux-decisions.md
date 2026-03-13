# Spaces UX Decisions

> Concrete UX decisions for the Spaces rewrite, complementing `spaces-rewrite.md`. These decisions were made during prototyping and should be folded into the Layer 1 UX spec when the rewrite ships.

---

## 1. Unified Space Layout

The Space view is **one unified layout** that progressively reveals features based on space size and settings. There are no hard "small space" vs "large space" modes — instead, features like search, filter chips, and sub-space browsing are **present but collapsed/hidden by default** in smaller spaces and **visible by default** in larger ones.

### Progressive feature visibility

| Feature        | Small space (<~10)                          | Large space (~10+)       |
| -------------- | ------------------------------------------- | ------------------------ |
| Search         | Hidden, accessible via icon in header       | Visible below state text |
| Filter chips   | Hidden                                      | Visible below search     |
| Sub-space list | Not shown (postings inline in conversation) | Primary view             |
| Conversation   | Primary view                                | Behind a tab/button      |
| State text     | Collapsible banner at top                   | Summary section at top   |

The threshold is not a hard cutoff — admins can override defaults. The system suggests layout based on member count.

---

## 2. Compose Area

### Message/Posting toggle

A **small pill toggle** to the left of the send button:

```
┌──────────────────────────────────────┐
│ [text input field                  ] │
│ [M|P]                          [→] │
└──────────────────────────────────────┘
```

- **M** = Message (default in small spaces)
- **P** = Posting
- Switching to **P** expands additional fields below the text input: capacity, deadline, visibility — inline, not a separate screen
- In posting-only spaces, the toggle is locked to **P** and visually muted (not interactive)
- The toggle is compact enough to not interfere with the text input on mobile

---

## 3. Rich Interactive Cards

### Layout

Rich cards (time proposals, RSVPs, polls, task claims, location confirms) render **full-width** in the conversation timeline, like system messages. They are **not** aligned to a sender's side.

```
┌──────────────────────────────────────┐
│ Alex: "Planning call this week?"     │  ← left-aligned message
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 📅 Time proposal                 │ │  ← full-width card
│ │  ○ Tue 18:00 — Alex ✓, Lena ✓   │ │
│ │  ○ Thu 18:30 — Alex ✓            │ │
│ │  Leading: Tue 18:00 (2/4)        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Kai: "Tuesday won't work"           │  ← left-aligned message
└──────────────────────────────────────┘
```

### Why full-width

- Cards are **shared objects** — every member interacts with them equally
- Full-width communicates "this belongs to the space, not to a person"
- Avoids awkward wide cards squeezed into a chat-bubble alignment
- System messages (card creation, updates, confirmations) also full-width

---

## 4. State Text

### Placement

A **collapsible banner** at the top of the conversation, below the header. Similar to a pinned message (Telegram-style) but richer:

```
┌──────────────────────────────────────┐
│ Space Name                   [i] [⋮] │
├──────────────────────────────────────┤
│ ▾ Weekly Spanish Practice — Tue...   │  ← collapsed: 1-2 lines + chevron
├──────────────────────────────────────┤
│ [conversation]                       │
```

Tapping expands to show the full state text with an edit button for privileged members:

```
├──────────────────────────────────────┤
│ ▴ Weekly Spanish Practice            │
│                                      │
│ Conversational Spanish, B1-B2 level. │
│ Tuesdays 18:30 at Cafe Frühling.     │
│ Bring your own topics!               │
│                                [edit]│
├──────────────────────────────────────┤
```

### In large spaces

The state text is **expanded by default** (serves as the space description/header for the sub-space directory view).

---

## 5. Space List (Main Screen)

### Style

WhatsApp-style messenger list with subtle enrichments:

```
┌──────────────────────────────────────┐
│ 🌐 Explore                    12:34 │  ← Global Space, always pinned
│    New: "Coffee near Marienplatz..." │
├──────────────────────────────────────┤
│ 📌 Data Structures Project     9:15 │  ← pinned space
│    Priya: "Assignment 3 done!"    3 │  ← unread badge
├──────────────────────────────────────┤
│ 🟢 Lena                      Yesterday│  ← 2-person, online indicator
│    "See you Thursday!"               │
├──────────────────────────────────────┤
│ XHacks 2026 · 47 members     Mon    │  ← member count for larger spaces
│    New posting: "Need UI designer"   │
└──────────────────────────────────────┘
```

### Enrichments over pure messenger style

- **Member count** shown subtly for spaces with >2 members (e.g., "· 47 members" after the name)
- **Online indicator** (green dot) for 2-person spaces when the other person is online
- **Pin icon** for user-pinned spaces
- **Global Space** always at the top with a distinctive icon

### Filter chips

Horizontally scrollable chips above the list: **All | DMs | Groups | Public | Pinned**

---

## 6. Navigation

### Bottom tab bar (mobile)

```
┌──────────────────────────────────────┐
│  [Spaces]     [Activity]   [Profile] │
│   ·            (3)                   │
└──────────────────────────────────────┘
```

- **Spaces** — space list (default tab)
- **Activity** — personal action cards, with **badge count** for pending actions
- **Profile** — profile editor + settings

### Floating Action Button

A **"+" FAB** above the bottom bar (right side) for creating a new space. Same pattern as the current "New Posting" FAB.

### Desktop

Sidebar equivalent: Spaces list in main area, Activity and Profile as sidebar sections.

---

## 7. Activity Tab Cards

Personal cards with inline actions. Each card type has a distinct visual treatment:

- **Match card**: posting preview + match score + explanation + [Join] [Pass]
- **Invite card**: space name + inviter + context + [Join] [Decline]
- **Scheduling card**: time proposal details + personalized note + [Accept] [Suggest different]
- **Connection request**: person info + [Accept] [Decline]
- **RSVP request**: event name + time + [Yes] [No] [Maybe]

Cards are sorted by urgency/recency. Acted-on cards fade/collapse but remain visible briefly for undo.

---

## 8. Posting Cards in Large Spaces

When a large space shows a directory of posting-messages, each card renders as:

```
┌──────────────────────────────────────┐
│ Alex · 2h ago                        │
│ Accessibility checker — need         │
│ designer + backend dev               │
│                                      │
│ 🏷 design, backend  👥 2/3  ⏰ Fri   │
│                            [Join →]  │
└──────────────────────────────────────┘
```

- Creator + time at top
- Posting text as primary content (2-3 lines)
- Compact meta line: tags, capacity, deadline
- Single CTA button
