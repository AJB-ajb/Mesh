---
name: keyboard-nav
description: "Keyboard navigation patterns for building accessible UI. Use this skill whenever creating or modifying interactive components — buttons, menus, dropdowns, modals, pickers, lists, toolbars, drag-and-drop surfaces, or any custom widget. Also use when reviewing components for keyboard accessibility, fixing focus issues, or when the user mentions keyboard navigation, tab order, focus management, or 'can't use without a mouse'."
---

# Keyboard Navigation Patterns

Technical power-users expect to operate the entire app without a mouse. Every interactive element must be reachable and operable via keyboard. This skill covers the patterns that make that happen in our stack (React, Radix/shadcn, Tailwind).

## Core Principle

If something responds to a click, it must also respond to keyboard input. The browser gives you this for free when you use the right elements — the most common keyboard accessibility bugs come from fighting the platform rather than using it.

## Element Selection

Use the element that matches the interaction:

| Interaction          | Element                    | Why                                                            |
| -------------------- | -------------------------- | -------------------------------------------------------------- |
| Triggers an action   | `<button>`                 | Activates on Enter and Space, focusable, announced as "button" |
| Navigates somewhere  | `<a href>`                 | Activates on Enter, focusable, announced as "link"             |
| Accepts text         | `<input>`, `<textarea>`    | Full keyboard support built in                                 |
| Selects from options | `<select>` or Radix Select | Arrow keys, type-ahead, Escape                                 |

Never put `onClick` on a `<div>` or `<span>`. If you think you need to, you actually need a `<button>` with custom styling. The `<button>` element costs nothing visually (style it however you want) and gives you focusability, Enter/Space activation, and screen reader semantics for free.

```tsx
// Wrong — keyboard users can't activate this
<div onClick={handleClick} className="cursor-pointer">Click me</div>

// Right — keyboard accessible by default
<button type="button" onClick={handleClick} className="cursor-pointer">Click me</button>
```

## Focus Visibility

Use `focus-visible` (not `focus`) for focus rings. This shows the ring only for keyboard navigation, not mouse clicks — which is what users expect.

```tsx
// Tailwind
className =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
```

Every interactive element needs a visible focus indicator. shadcn components include this by default — don't remove it.

## Command Palette

The app includes a command palette integrated into the global search (`src/components/layout/global-search.tsx`). It provides quick keyboard-driven access to navigation and actions.

### How it works

- `Cmd/Ctrl+K` opens the search. When the dropdown is open (even with empty query), "Quick Actions" are shown above search results.
- Actions are defined in `src/lib/command-palette/actions.ts` as a registry array.
- `src/lib/command-palette/filter-actions.ts` filters actions by substring matching label + keywords.
- Arrow keys navigate the combined list (actions first, then search results). Enter executes.

### Adding a new action

Add an entry to the array in `createActions()` in `src/lib/command-palette/actions.ts`:

```ts
{
  id: "my-action",
  label: labels.commandPalette.myAction,       // add label to labels.ts
  description: labels.commandPalette.myActionDesc,
  icon: SomeLucideIcon,
  keywords: ["relevant", "search", "terms"],
  execute: (ctx) => ctx.router.push("/somewhere"),
}
```

The `ActionContext` provides `router` (Next.js) and `cycleTheme`.

## `useRovingIndex` Hook

A reusable hook for the roving tabindex pattern — arrow keys move within a list, one Tab stop per list.

**File**: `src/lib/hooks/use-roving-index.ts`

### API

```ts
const { activeIndex, setActiveIndex, getContainerProps, getItemProps } =
  useRovingIndex({
    itemCount: items.length,
    orientation: "vertical", // or "horizontal"
    onActivate: (index) => handleSelect(items[index]),
    loop: true, // wrap around at boundaries
  });
```

### Usage

```tsx
<div {...getContainerProps()}>
  {items.map((item, i) => (
    <button key={item.id} {...getItemProps(i)} onClick={() => select(item)}>
      {item.label}
    </button>
  ))}
</div>
```

`getItemProps(i)` returns `{ tabIndex: 0 | -1, "data-active": boolean, onFocus }`. Only the active item gets `tabIndex={0}` — all others get `-1`, so Tab skips the group as a whole.

### Where it's used

- **Sidebar**: Two instances (primary nav, secondary nav) in `src/components/layout/sidebar.tsx`
- **Conversation list**: `src/components/inbox/conversation-panel.tsx`
- **Connections list**: `src/components/connections/connections-left-panel.tsx`
- **Notifications dropdown**: `src/components/layout/notifications-dropdown.tsx`

## Keyboard Help Panel

Press `?` (outside input fields) to open a keyboard shortcuts dialog listing all available shortcuts.

**Files**:

- `src/components/layout/global-keyboard-shortcuts.tsx` — listens for `?` key, renders dialog
- `src/components/layout/keyboard-help-dialog.tsx` — the Dialog component listing shortcuts

Rendered in `src/components/layout/app-shell.tsx` via `<GlobalKeyboardShortcuts />`.

### Adding a shortcut to the help dialog

Edit the `shortcuts` array in `keyboard-help-dialog.tsx`:

```ts
{ keys: [mod, "K"], description: labels.a11y.shortcuts.openSearch },
```

## Composite Widget Patterns

These are widgets where multiple interactive items act as a single unit. The pattern: Tab into the group, arrow keys to move within it, Tab to leave.

### Dropdown / Listbox / Menu

Use Radix DropdownMenu, Select, or Combobox. They handle all of this:

- Enter/Space opens the menu
- Arrow keys navigate items
- Enter selects the focused item
- Escape closes without selecting
- Type-ahead to jump to items

If building a custom dropdown (e.g., autocomplete, skill picker), implement these keyboard behaviors on the input's `onKeyDown`:

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!isOpen) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      break;
    case "ArrowUp":
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      break;
    case "Enter":
      e.preventDefault();
      if (items[selectedIndex]) selectItem(items[selectedIndex]);
      break;
    case "Escape":
      e.preventDefault();
      setIsOpen(false);
      break;
  }
};
```

Add `role="listbox"` on the list container and `role="option"` + `aria-selected` on each item:

```tsx
<div role="listbox">
  {items.map((item, i) => (
    <button
      key={item.id}
      role="option"
      aria-selected={i === selectedIndex}
      onClick={() => selectItem(item)}
    >
      {item.label}
    </button>
  ))}
</div>
```

### Toggle Buttons

For buttons that flip between on/off states, add `aria-pressed`:

```tsx
<button
  onClick={onToggle}
  aria-pressed={isActive}
  className={isActive ? "bg-primary text-primary-foreground" : "bg-muted"}
>
  {label}
</button>
```

### Tabs / Tab Panels

Use Radix Tabs. The keyboard contract:

- Arrow keys switch between tabs
- Tab key moves focus into the panel content
- Home/End jump to first/last tab

### Toolbar

Group related buttons in a `role="toolbar"` container. Arrow keys move between buttons, Tab skips the whole group.

## Focus Management

### Dialogs and Modals

Radix Dialog handles this, but the rules are:

1. When a dialog opens, move focus to the first focusable element inside it (or the dialog itself)
2. Tab cycles within the dialog only (focus trap)
3. Escape closes the dialog
4. When the dialog closes, return focus to the element that triggered it

If building a custom overlay without Radix Dialog, use `@radix-ui/react-focus-scope` or implement a focus trap manually.

### Dynamic Content

When new content appears (a dropdown opens, search results load, a notification arrives), focus should move to it only if the user initiated the action. Don't steal focus from an unrelated interaction.

For scroll-into-view of a keyboard-selected item in a list:

```tsx
useEffect(() => {
  const selected = listRef.current?.querySelector('[aria-selected="true"]');
  selected?.scrollIntoView({ block: "nearest" });
}, [selectedIndex]);
```

### Focus Return

When an element that had focus is removed from the DOM (e.g., a deleted list item, a closed popover), move focus to a sensible neighbor — usually the previous item or the parent container. Don't let focus fall to `<body>`.

## Keyboard Alternatives for Mouse-Only Interactions

### Drag and Drop

Drag-and-drop is inherently mouse-oriented. Always provide a keyboard alternative:

- **Reordering lists**: Arrow keys to move items up/down when focused, or a "move" menu
- **Resizing**: Arrow keys to adjust by increment, or input fields for exact values
- **Drawing/selecting regions**: Input fields for coordinates/dimensions

The keyboard alternative doesn't need to be as fluid as the mouse interaction — it just needs to give full functionality.

### Hover-Only Actions

Actions that appear on hover (edit buttons, delete icons, tooltips) must also appear on focus. Use the CSS group pattern:

```tsx
<div className="group">
  <span>{item.name}</span>
  <button className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
    Edit
  </button>
</div>
```

## Tab Order

The default tab order follows DOM order — which is usually correct if your markup is semantic. Rules:

- Never use `tabIndex` > 0. It breaks the natural flow.
- Use `tabIndex={0}` only when you need a non-interactive element to be focusable (rare).
- Use `tabIndex={-1}` for elements that should be focusable programmatically but not via Tab (e.g., the main content area for skip-link targets).
- If the visual order differs from DOM order (via CSS flex `order`, grid placement, or absolute positioning), make sure the tab order still makes sense.

## Quick Checklist

When building or modifying an interactive component, verify:

- [ ] Can I Tab to every interactive element?
- [ ] Can I activate it with Enter or Space?
- [ ] If it's a composite widget (menu, listbox, tabs), do arrow keys work?
- [ ] Can I dismiss overlays with Escape?
- [ ] Is there a visible focus indicator?
- [ ] Does focus move logically when content appears/disappears?
- [ ] If there's drag-and-drop or hover-only UI, is there a keyboard alternative?
- [ ] Are ARIA attributes present where needed (`aria-selected`, `aria-pressed`, `aria-expanded`)?
