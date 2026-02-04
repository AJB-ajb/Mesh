import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export type StatItem = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export function StatsOverview({ stats }: { stats: StatItem[] }) {
  return (
    <div data-testid="stats-overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
            <Link
              href={stat.href}
              className="absolute inset-0"
              aria-label={`View ${stat.title}`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
