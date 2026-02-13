# comp-too-large

**Category**: Component Structure | **Severity**: MEDIUM

## Pattern

React components exceeding 300 lines indicate too many responsibilities:

## Detection

Check `src/components/` for files over 300 lines:

```bash
find src/components -name "*.tsx" -exec sh -c 'wc -l "$1" | awk "\$1 > 300 {print}"' _ {} \;
```

Known large components (as of last review):

- `profile-form.tsx` (~504 lines)
- `posting-detail-header.tsx` (~410 lines)
- `conversation-panel.tsx` (~394 lines)
- `posting-form-card.tsx` (~366 lines)

## Fix

Extract sub-components by logical sections:

- **Forms**: Extract field groups (skill level inputs, location fields, availability grid)
- **Headers**: Extract action buttons, status badges, metadata display
- **Panels**: Extract message list, input area, participant info

Each extracted component should be:

- In the same directory (co-located)
- Named descriptively (e.g., `profile-form-skills.tsx`)
- Under 200 lines ideally
