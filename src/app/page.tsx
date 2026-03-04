import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  GraduationCap,
  Code,
  Trophy,
  Zap,
  MessageCircle,
  Calendar,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ScenarioSection } from "@/components/landing/scenario-comparison";
import { createClient } from "@/lib/supabase/server";
import { labels } from "@/lib/labels";

const problemItems = [
  {
    icon: MessageCircle,
    title: labels.landing.problemGroupChatsTitle,
    body: labels.landing.problemGroupChatsBody,
  },
  {
    icon: Calendar,
    title: labels.landing.problemMeetupsTitle,
    body: labels.landing.problemMeetupsBody,
  },
  {
    icon: FileText,
    title: labels.landing.problemForumsTitle,
    body: labels.landing.problemForumsBody,
  },
];

const useCaseItems = [
  {
    icon: GraduationCap,
    title: "Academic",
    body: "Study groups, lab partners, research collaborators.",
  },
  {
    icon: Code,
    title: "Hackathons",
    body: "Assemble a balanced team before the event starts.",
  },
  {
    icon: Trophy,
    title: "Hobbies & Sports",
    body: "Tennis partner, band member, running buddy.",
  },
  {
    icon: Zap,
    title: "Spontaneous",
    body: "Concert tonight? Road trip this weekend? Find someone who\u2019s in.",
  },
];

export default async function LandingPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to active page
  if (user) {
    redirect("/posts");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">{labels.landing.loginButton}</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center lg:px-8 lg:py-24">
          {/* Badge */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <Users className="size-4 text-blue-500" />
              <span className="text-muted-foreground">
                {labels.landing.heroBadge}
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl animate-slide-up text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {labels.landing.heroTitle}
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
                {labels.landing.postSomethingButton}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8" asChild>
              <Link href="/why">{labels.landing.whyMeshButton}</Link>
            </Button>
          </div>
        </section>

        {/* Problem Section */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.landing.problemSectionTitle}
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {problemItems.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-lg font-medium">
              {labels.landing.problemConclusion}
            </p>
          </div>
        </section>

        {/* Scenario Comparisons */}
        <ScenarioSection
          scenarios={[
            labels.landing.scenarios.quickCall,
            labels.landing.scenarios.groupDinner,
          ]}
        />

        {/* How It Works Section */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.landing.howItWorksTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {labels.landing.howItWorksSubtitle}
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border/80 hover:shadow-lg">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold">
                  {labels.landing.howItWorksStep1Title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {labels.landing.howItWorksStep1Body}
                </p>
              </div>

              {/* Step 2 */}
              <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border/80 hover:shadow-lg">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
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
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold">
                  {labels.landing.howItWorksStep3Title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {labels.landing.howItWorksStep3Body}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.landing.useCaseSectionTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {labels.landing.useCaseSectionSubtitle}
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {useCaseItems.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.landing.finalCtaTitle}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {labels.landing.ctaBody}
            </p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link href="/login">
                  {labels.landing.getStartedButton}
                  <ArrowRight className="size-4" />
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
            {labels.landing.footerCopyright}
          </p>
          <nav className="flex gap-6">
            <Link
              href="/why"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {labels.landing.whyMeshLink}
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {labels.landing.privacyLink}
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {labels.landing.termsLink}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
