import { labels } from "@/lib/labels";

export type SlashCommandType = "action" | "content";

export interface SlashCommand {
  /** Unique identifier used for matching and overlay routing */
  name: string;
  /** Icon name for the SlashCommandMenu */
  icon: string;
  /** Display label shown in the menu */
  label: string;
  /** Short description shown below the label */
  description: string;
  /** "action" opens an overlay, "content" inserts text directly */
  type: SlashCommandType;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "time",
    icon: "Clock",
    label: labels.slashCommands.time.label,
    description: labels.slashCommands.time.description,
    type: "action",
  },
  {
    name: "location",
    icon: "MapPin",
    label: labels.slashCommands.location.label,
    description: labels.slashCommands.location.description,
    type: "action",
  },
  {
    name: "skills",
    icon: "Wrench",
    label: labels.slashCommands.skills.label,
    description: labels.slashCommands.skills.description,
    type: "action",
  },
  {
    name: "template",
    icon: "FileText",
    label: labels.slashCommands.template.label,
    description: labels.slashCommands.template.description,
    type: "action",
  },
];

/**
 * Filter commands by a query string. Matches against the command name and label.
 */
export function filterCommands(query: string): SlashCommand[] {
  const lower = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.label.toLowerCase().includes(lower),
  );
}
