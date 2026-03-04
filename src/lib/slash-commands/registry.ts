import { labels } from "@/lib/labels";

export type SlashCommandType = "action" | "content" | "setting" | "immediate";

export interface SlashCommand {
  /** Unique identifier used for matching and overlay routing */
  name: string;
  /** Icon name for the SlashCommandMenu */
  icon: string;
  /** Display label shown in the menu */
  label: string;
  /** Short description shown below the label */
  description: string;
  /** "action" opens an overlay, "content" inserts text directly,
   *  "setting" opens an inline picker, "immediate" runs instantly */
  type: SlashCommandType;
  /** Restrict to a specific context; omit to show everywhere */
  context?: "posting" | "profile";
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
  {
    name: "hidden",
    icon: "Lock",
    label: labels.slashCommands.hidden.label,
    description: labels.slashCommands.hidden.description,
    type: "content",
  },
  {
    name: "size",
    icon: "Users",
    label: labels.slashCommands.size.label,
    description: labels.slashCommands.size.description,
    type: "content",
    context: "posting",
  },
  {
    name: "visibility",
    icon: "Eye",
    label: labels.slashCommands.visibility.label,
    description: labels.slashCommands.visibility.description,
    type: "setting",
    context: "posting",
  },
  {
    name: "expire",
    icon: "CalendarClock",
    label: labels.slashCommands.expire.label,
    description: labels.slashCommands.expire.description,
    type: "setting",
    context: "posting",
  },
  {
    name: "autoaccept",
    icon: "CheckCircle",
    label: labels.slashCommands.autoaccept.label,
    description: labels.slashCommands.autoaccept.description,
    type: "setting",
    context: "posting",
  },
  {
    name: "invite",
    icon: "UserPlus",
    label: labels.slashCommands.invite.label,
    description: labels.slashCommands.invite.description,
    type: "action",
    context: "posting",
  },
  {
    name: "format",
    icon: "Sparkles",
    label: labels.slashCommands.format.label,
    description: labels.slashCommands.format.description,
    type: "immediate",
  },
  {
    name: "clean",
    icon: "Eraser",
    label: labels.slashCommands.clean.label,
    description: labels.slashCommands.clean.description,
    type: "immediate",
  },
];

/**
 * Filter commands by a query string. Matches against the command name and label.
 */
export function filterCommands(
  query: string,
  commands: SlashCommand[] = SLASH_COMMANDS,
): SlashCommand[] {
  const lower = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.label.toLowerCase().includes(lower),
  );
}

/**
 * Filter commands by context. Commands without a context are always included.
 */
export function filterCommandsByContext(
  context?: "posting" | "profile",
): SlashCommand[] {
  if (!context) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) => !cmd.context || cmd.context === context,
  );
}
