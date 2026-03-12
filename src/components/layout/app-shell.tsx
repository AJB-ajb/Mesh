import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomBar } from "./bottom-bar";
import { TestModeBanner } from "./test-mode-banner";
import { SkipLink } from "@/components/ui/skip-link";
import { GlobalKeyboardShortcuts } from "./global-keyboard-shortcuts";
import { PresenceProvider } from "@/components/providers/presence-provider";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <PresenceProvider>
      <div className="flex h-dvh">
        <SkipLink />
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
          <TestModeBanner />
          <Header />
          <main
            id="main-content"
            className={cn("flex-1 p-4 pb-20 sm:p-6 md:pb-6", className)}
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
        <BottomBar />
        <GlobalKeyboardShortcuts />
      </div>
    </PresenceProvider>
  );
}
