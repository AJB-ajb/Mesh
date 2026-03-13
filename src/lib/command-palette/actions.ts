import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  Bell,
  User,
  Settings,
  Palette,
} from "lucide-react";
import { labels } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

export type PaletteAction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  execute: (ctx: ActionContext) => void;
};

export type ActionContext = {
  router: { push: (url: string) => void };
  cycleTheme: () => void;
};

export function createActions(ctx: ActionContext): PaletteAction[] {
  return [
    {
      id: "go-spaces",
      label: labels.commandPalette.goToSpaces,
      description: labels.commandPalette.goToSpacesDesc,
      icon: MessageSquare,
      keywords: ["browse", "explore", "find", "search", "discover", "postings", "projects"],
      execute: () => ctx.router.push(ROUTES.spaces),
    },
    {
      id: "go-activity",
      label: labels.commandPalette.goToActivity,
      description: labels.commandPalette.goToActivityDesc,
      icon: Bell,
      keywords: ["notifications", "updates", "feed"],
      execute: () => ctx.router.push(ROUTES.activity),
    },
    {
      id: "go-profile",
      label: labels.commandPalette.goToProfile,
      description: labels.commandPalette.goToProfileDesc,
      icon: User,
      keywords: ["me", "account", "edit"],
      execute: () => ctx.router.push(ROUTES.profile),
    },
    {
      id: "go-settings",
      label: labels.commandPalette.goToSettings,
      description: labels.commandPalette.goToSettingsDesc,
      icon: Settings,
      keywords: ["preferences", "config", "account"],
      execute: () => ctx.router.push(ROUTES.settings),
    },
    {
      id: "toggle-theme",
      label: labels.commandPalette.toggleTheme,
      description: labels.commandPalette.toggleThemeDesc,
      icon: Palette,
      keywords: ["dark", "light", "dusk", "mode", "appearance"],
      execute: () => ctx.cycleTheme(),
    },
  ];
}
