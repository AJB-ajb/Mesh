import { Zap } from "lucide-react";

import { labels } from "@/lib/labels";
import { EmptyState } from "@/components/ui/empty-state";

export default function ActivePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.active.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{labels.active.subtitle}</p>
      </div>

      <EmptyState
        icon={<Zap />}
        title={labels.active.comingSoon}
        description={labels.active.comingSoonDescription}
      />
    </div>
  );
}
