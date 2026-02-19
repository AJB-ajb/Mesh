import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  MessageSquare,
  Mic,
  Zap,
  Search,
  BookOpen,
  Code,
  Music,
  Briefcase,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { labels } from "@/lib/labels";

const examplePostings = [
  {
    icon: BookOpen,
    title: "Linear Algebra study group for finals",
    description:
      "Looking for 2-3 people to study for the Linear Algebra final together. Meet twice a week at the library.",
    skills: ["Linear Algebra", "Math"],
    category: "Study",
    teamSize: "2-3 people",
    creator: { name: "Sarah K.", initials: "SK" },
  },
  {
    icon: Code,
    title: "Need 2 frontend devs for AI hackathon",
    description:
      "Building an AI-powered accessibility tool this weekend at HackMIT. Looking for React/Next.js experience.",
    skills: ["React", "Next.js", "AI/ML"],
    category: "Hackathon",
    teamSize: "3 people",
    creator: { name: "James R.", initials: "JR" },
  },
  {
    icon: Music,
    title: "Coldplay concert — March 15",
    description:
      "Anyone want to go to the Coldplay concert on March 15? Have an extra ticket, looking for someone to go with.",
    skills: ["Music", "Live Events"],
    category: "Social",
    teamSize: "1 person",
    creator: { name: "Mia L.", initials: "ML" },
  },
  {
    icon: Code,
    title: "Recipe app — need React + API help",
    description:
      "Building a recipe sharing app as a side project. Need someone with React and REST API experience to collaborate.",
    skills: ["React", "REST APIs", "Node.js"],
    category: "Side Project",
    teamSize: "1-2 people",
    creator: { name: "Alex T.", initials: "AT" },
  },
  {
    icon: Briefcase,
    title: "Co-founder for EdTech startup",
    description:
      "Seeking a co-founder with business development skills for an EdTech startup. Technical MVP is ready.",
    skills: ["Business Dev", "EdTech", "Strategy"],
    category: "Professional",
    teamSize: "1 person",
    creator: { name: "Priya N.", initials: "PN" },
  },
  {
    icon: Trophy,
    title: "Tennis doubles partner — weekday evenings",
    description:
      "Looking for an intermediate-level tennis partner for doubles. Available weekday evenings in the Hamburg area.",
    skills: ["Tennis", "Intermediate"],
    category: "Sports",
    teamSize: "1 person",
    creator: { name: "Tom W.", initials: "TW" },
  },
];

export default async function LandingPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center lg:px-8 lg:py-24">
          {/* Badge */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">
                {labels.landing.heroBadge}
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl animate-slide-up text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find people to do
            <br />
            things with.
          </h1>

          {/* Subheadline */}
          <p
            className="mt-6 max-w-2xl animate-slide-up text-lg text-muted-foreground sm:text-xl"
            style={{ animationDelay: "100ms" }}
          >
            {labels.landing.heroSubheadline}
          </p>

          {/* CTA Buttons */}
          <div
            className="mt-10 flex flex-col items-center gap-4 animate-slide-up sm:flex-row"
            style={{ animationDelay: "200ms" }}
          >
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link href="/login?next=/postings/new">
                Post something
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8" asChild>
              <Link href="/postings">Explore postings</Link>
            </Button>
          </div>
        </section>

        {/* Use Case Examples Section */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              People are looking for all kinds of things
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              From study partners to startup co-founders — post what you want to
              do and find the right people.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {examplePostings.map((posting) => (
                <Card
                  key={posting.title}
                  className="overflow-hidden transition-all hover:shadow-lg"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <posting.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <Badge variant="secondary">{posting.category}</Badge>
                        <CardTitle className="text-base">
                          {posting.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-sm line-clamp-2">
                      {posting.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1.5">
                      {posting.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {posting.teamSize}
                      </span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {posting.creator.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{posting.creator.name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              From idea to collaboration in under a minute.
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border/80 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold">
                  Describe what you want to do
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Paste text, speak, or fill a form — describe any activity,
                  project, or event you need people for.
                </p>
              </div>

              {/* Step 2 */}
              <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border/80 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-semibold">
                  {labels.landing.howItWorksStep2Title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {labels.landing.howItWorksStep2Body}
                </p>
              </div>

              {/* Step 3 */}
              <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border/80 hover:shadow-lg sm:col-span-2 lg:col-span-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold">
                  Connect and collaborate
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Chat, plan, and do the thing — whether it&apos;s a hackathon,
                  a tennis match, or a startup launch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Built for real connections
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Smart tools that make finding the right people effortless.
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">
                  {labels.landing.smartMatchingTitle}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {labels.landing.smartMatchingBody}
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mic className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Voice & Text Input</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe what you&apos;re looking for in your own words — type
                  it out or just speak.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Real-Time Messaging</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connect instantly with your matches and start planning
                  together right away.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Smart Compatibility</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  See why someone is a good match — skills, availability,
                  location, and interest alignment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to find your people?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {labels.landing.ctaBody}
            </p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link href="/login">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-8">
          <p className="text-sm text-muted-foreground">
            © 2026 MeshIt. All rights reserved.
          </p>
          <nav className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
