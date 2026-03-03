import { keymap, EditorView } from "@codemirror/view";
import {
  EditorState,
  StateField,
  StateEffect,
  type Extension,
} from "@codemirror/state";
import {
  filterCommands,
  SLASH_COMMANDS,
  type SlashCommand,
} from "@/lib/slash-commands/registry";

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

/** Reactive state exposed to React for rendering the slash command menu. */
export interface SlashMenuState {
  isOpen: boolean;
  query: string;
  commands: SlashCommand[];
  selectedIndex: number;
  /** Start of the `/query` range (character offset). */
  from: number;
  /** End of the `/query` range (character offset). */
  to: number;
}

// ---------------------------------------------------------------------------
// State effects (keyboard actions only — detection is in the state field)
// ---------------------------------------------------------------------------

const closeSlashMenu = StateEffect.define<void>();
const selectSlashItem = StateEffect.define<number>();

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_STATE: SlashMenuState = {
  isOpen: false,
  query: "",
  commands: [],
  selectedIndex: 0,
  from: 0,
  to: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Scan backward from the cursor to detect a `/query` pattern.
 * Returns `{ from, query }` if found, or `null` otherwise.
 *
 * The `/` must be at the start of the line or preceded by whitespace.
 * Only word characters (letters, digits, underscore) are allowed between
 * `/` and the cursor.
 */
function detectSlashContext(
  state: EditorState,
): { from: number; query: string } | null {
  const { head } = state.selection.main;
  const line = state.doc.lineAt(head);
  const lineStart = line.from;
  const textBefore = state.doc.sliceString(lineStart, head);

  // Match a `/` preceded by start-of-line or whitespace, followed by word chars
  const match = textBefore.match(/(^|\s)\/([\w]*)$/);
  if (!match) return null;

  // `from` points at the `/` character
  const slashOffset = match.index! + match[1].length;
  const from = lineStart + slashOffset;
  const query = match[2];

  return { from, query };
}

// ---------------------------------------------------------------------------
// State field — detects slash context synchronously from doc/selection
// changes, handles keyboard effects (close, select item).
// ---------------------------------------------------------------------------

export const slashMenuState = StateField.define<SlashMenuState>({
  create() {
    return INITIAL_STATE;
  },

  update(value, tr) {
    // Handle keyboard effects first
    for (const effect of tr.effects) {
      if (effect.is(closeSlashMenu)) {
        return INITIAL_STATE;
      }
      if (effect.is(selectSlashItem)) {
        return { ...value, selectedIndex: effect.value };
      }
    }

    // Auto-detect slash context from doc/selection changes
    if (tr.docChanged || tr.selection) {
      const ctx = detectSlashContext(tr.state);
      if (ctx) {
        const { from, query } = ctx;
        const to = tr.state.selection.main.head;
        const commands = query === "" ? SLASH_COMMANDS : filterCommands(query);

        if (!value.isOpen) {
          // Open the menu
          return { isOpen: true, query, commands, selectedIndex: 0, from, to };
        }
        if (query !== value.query || to !== value.to) {
          // Update the menu
          const selectedIndex = Math.min(
            value.selectedIndex,
            Math.max(0, commands.length - 1),
          );
          return { ...value, to, query, commands, selectedIndex };
        }
      } else if (value.isOpen) {
        // Close the menu — user moved away from the slash context
        return INITIAL_STATE;
      }
    }

    return value;
  },
});

// ---------------------------------------------------------------------------
// Callback types
// ---------------------------------------------------------------------------

export interface SlashCommandCallbacks {
  /** Called whenever the slash menu state changes. */
  onStateChange: (state: SlashMenuState) => void;
  /** Called when the user selects a command (Enter key or mouse click). */
  onSelectCommand: (command: SlashCommand, view?: EditorView) => void;
}

// ---------------------------------------------------------------------------
// Keymap — intercepts navigation keys when the menu is open
// ---------------------------------------------------------------------------

function createSlashKeymap(callbacks: SlashCommandCallbacks) {
  return keymap.of([
    {
      key: "ArrowDown",
      run(view) {
        const state = view.state.field(slashMenuState);
        if (!state.isOpen || state.commands.length === 0) return false;
        const next = (state.selectedIndex + 1) % state.commands.length;
        view.dispatch({ effects: selectSlashItem.of(next) });
        return true;
      },
    },
    {
      key: "ArrowUp",
      run(view) {
        const state = view.state.field(slashMenuState);
        if (!state.isOpen || state.commands.length === 0) return false;
        const next =
          (state.selectedIndex - 1 + state.commands.length) %
          state.commands.length;
        view.dispatch({ effects: selectSlashItem.of(next) });
        return true;
      },
    },
    {
      key: "Enter",
      run(view) {
        const state = view.state.field(slashMenuState);
        if (!state.isOpen || state.commands.length === 0) return false;
        const cmd = state.commands[state.selectedIndex];
        if (!cmd) return false;

        // Delete the /query text
        view.dispatch({
          changes: { from: state.from, to: state.to, insert: "" },
          effects: closeSlashMenu.of(undefined),
        });
        callbacks.onSelectCommand(cmd, view);
        return true;
      },
    },
    {
      key: "Tab",
      run(view) {
        const state = view.state.field(slashMenuState);
        if (!state.isOpen || state.commands.length === 0) return false;
        const cmd = state.commands[state.selectedIndex];
        if (!cmd) return false;

        // Delete the /query text
        view.dispatch({
          changes: { from: state.from, to: state.to, insert: "" },
          effects: closeSlashMenu.of(undefined),
        });
        callbacks.onSelectCommand(cmd, view);
        return true;
      },
    },
    {
      key: "Escape",
      run(view) {
        const state = view.state.field(slashMenuState);
        if (!state.isOpen) return false;
        view.dispatch({ effects: closeSlashMenu.of(undefined) });
        return true;
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Listener — forwards state field changes to the React callback
// ---------------------------------------------------------------------------

function createSlashListener(callbacks: SlashCommandCallbacks) {
  let prev: SlashMenuState = INITIAL_STATE;
  return EditorView.updateListener.of((update) => {
    const next = update.state.field(slashMenuState);
    if (next !== prev) {
      prev = next;
      // Defer to escape CodeMirror's synchronous update cycle — React
      // setState calls made during CM6 updateListener can be dropped
      // when they coincide with React's own commit phase.
      queueMicrotask(() => callbacks.onStateChange(next));
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the CodeMirror extension array for slash commands.
 *
 * Returns `[stateField, keymap, listener]` — spread or pass
 * directly as `extensions` to the editor.
 */
export function slashCommandPlugin(
  callbacks: SlashCommandCallbacks,
): Extension {
  return [
    slashMenuState,
    createSlashKeymap(callbacks),
    createSlashListener(callbacks),
  ];
}

/**
 * Programmatically select a slash command (e.g. from a mouse click on the
 * menu). Deletes the `/query` text, closes the menu, and fires the callback.
 */
export function selectSlashCommand(view: EditorView): void {
  const state = view.state.field(slashMenuState);
  if (!state.isOpen) return;

  view.dispatch({
    changes: { from: state.from, to: state.to, insert: "" },
    effects: closeSlashMenu.of(undefined),
  });
}

/**
 * Programmatically close the slash menu from React (e.g. clicking outside).
 * Dispatches the close effect only if the menu is currently open.
 */
export function dispatchCloseSlashMenu(view: EditorView): void {
  const state = view.state.field(slashMenuState);
  if (!state.isOpen) return;
  view.dispatch({ effects: closeSlashMenu.of(undefined) });
}
