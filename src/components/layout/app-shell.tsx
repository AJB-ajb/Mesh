import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TestModeBanner } from "./test-mode-banner";
import { SkipLink } from "@/components/ui/skip-link";
import { PresenceProvider } from "@/components/providers/presence-provider";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <PresenceProvider>
      <div className="flex min-h-screen">
        <SkipLink />
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          <TestModeBanner />
          <Header />
          <main
            id="main-content"
            className={cn("flex-1 p-4 sm:p-6", className)}
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </PresenceProvider>
  );
}
