import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ProjectCard } from "@/components/project/project-card";

export type RecommendedProject = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  teamSize: string;
  timeline: string;
  commitment: string;
  matchScore: number;
  creator: { name: string; initials: string };
  createdAt: string;
};

export function RecommendedProjects({
  projects,
}: {
  projects: RecommendedProject[];
}) {
  return (
    <div data-testid="recommended-projects" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recommended projects</h2>
          <p className="text-sm text-muted-foreground">
            Project posters that match your profile and preferences.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/projects">Browse all projects</Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))
        ) : (
          <Card>
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No recommended projects yet. Complete your profile to get
                personalized recommendations!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
