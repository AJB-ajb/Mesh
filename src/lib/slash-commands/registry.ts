import { labels } from "@/lib/labels";

export type SlashCommandType = "content" | "action";

export interface SlashCommand {
  name: string;
  icon: string;
  description: string;
  type: SlashCommandType;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "time",
    icon: "Clock",
    description: labels.slashCommands.timeDescription,
    type: "action",
  },
  {
    name: "location",
    icon: "MapPin",
    description: labels.slashCommands.locationDescription,
    type: "action",
  },
  {
    name: "skills",
    icon: "Wrench",
    description: labels.slashCommands.skillsDescription,
    type: "action",
  },
  {
    name: "template",
    icon: "FileText",
    description: labels.slashCommands.templateDescription,
    type: "action",
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const lower = query.toLowerCase();
  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(lower));
}
