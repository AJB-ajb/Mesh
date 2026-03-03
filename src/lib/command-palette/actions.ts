import type { LucideIcon } from "lucide-react";
import {
  Compass,
  FolderKanban,
  Users,
  User,
  Settings,
  Plus,
  Palette,
} from "lucide-react";
import { labels } from "@/lib/labels";

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
      id: "go-discover",
      label: labels.commandPalette.goToDiscover,
      description: labels.commandPalette.goToDiscoverDesc,
      icon: Compass,
      keywords: ["browse", "explore", "find", "search", "discover"],
      execute: () => ctx.router.push("/discover"),
    },
    {
      id: "go-posts",
      label: labels.commandPalette.goToPosts,
      description: labels.commandPalette.goToPostsDesc,
      icon: FolderKanban,
      keywords: ["postings", "projects", "my"],
      execute: () => ctx.router.push("/posts"),
    },
    {
      id: "go-connections",
      label: labels.commandPalette.goToConnections,
      description: labels.commandPalette.goToConnectionsDesc,
      icon: Users,
      keywords: ["friends", "network", "people", "messages", "chat"],
      execute: () => ctx.router.push("/connections"),
    },
    {
      id: "go-profile",
      label: labels.commandPalette.goToProfile,
      description: labels.commandPalette.goToProfileDesc,
      icon: User,
      keywords: ["me", "account", "edit"],
      execute: () => ctx.router.push("/profile"),
    },
    {
      id: "go-settings",
      label: labels.commandPalette.goToSettings,
      description: labels.commandPalette.goToSettingsDesc,
      icon: Settings,
      keywords: ["preferences", "config", "account"],
      execute: () => ctx.router.push("/settings"),
    },
    {
      id: "create-posting",
      label: labels.commandPalette.createPosting,
      description: labels.commandPalette.createPostingDesc,
      icon: Plus,
      keywords: ["new", "post", "add"],
      execute: () => ctx.router.push("/postings/new"),
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
