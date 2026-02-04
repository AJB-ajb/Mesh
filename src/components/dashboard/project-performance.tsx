import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ProjectMetric = {
  id: string;
  title: string;
  status: string;
  applicants: number;
  matches: number;
  views: number;
};

export function ProjectPerformance({
  metrics,
}: {
  metrics: ProjectMetric[];
}) {
  return (
    <div data-testid="project-performance" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Project performance</h2>
          <p className="text-sm text-muted-foreground">
            Track your posted projects and their engagement metrics.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Add project
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.length > 0 ? (
          metrics.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <CardDescription>
                  Track applicants, matches, and views for this project.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Applicants</p>
                  <p className="text-lg font-semibold">
                    {project.applicants}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Matches</p>
                  <p className="text-lg font-semibold">{project.matches}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="text-lg font-semibold">{project.views}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t created any projects yet. Create your first
                project to see metrics here!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
