import { Users } from "lucide-react";

import { labels } from "@/lib/labels";
import { EmptyState } from "@/components/ui/empty-state";

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.connectionsPage.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {labels.connectionsPage.subtitle}
        </p>
      </div>

      <EmptyState
        icon={<Users />}
        title={labels.connectionsPage.comingSoon}
        description={labels.connectionsPage.comingSoonDescription}
      />
    </div>
  );
}
