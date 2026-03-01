import Link from "next/link";
import {
  ArrowRight,
  Users,
  MessageCircle,
  Calendar,
  FileText,
  Lightbulb,
  UserPlus,
  Sparkles,
  GraduationCap,
  Code,
  Briefcase,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { labels } from "@/lib/labels";

const problemItems = [
  {
    icon: MessageCircle,
    title: labels.why.problemGroupChatsTitle,
    body: labels.why.problemGroupChatsBody,
  },
  {
    icon: Calendar,
    title: labels.why.problemMeetupsTitle,
    body: labels.why.problemMeetupsBody,
  },
  {
    icon: FileText,
    title: labels.why.problemForumsTitle,
    body: labels.why.problemForumsBody,
  },
];

const howDifferentItems = [
  {
    icon: Lightbulb,
    title: labels.why.howDifferentIdeaFirst,
    body: labels.why.howDifferentIdeaFirstBody,
  },
  {
    icon: UserPlus,
    title: labels.why.howDifferentNoSetup,
    body: labels.why.howDifferentNoSetupBody,
  },
  {
    icon: Sparkles,
    title: labels.why.howDifferentSmartMatching,
    body: labels.why.howDifferentSmartMatchingBody,
  },
];

const useCaseItems = [
  {
    icon: GraduationCap,
    title: labels.why.useCaseAcademicTitle,
    body: labels.why.useCaseAcademicBody,
  },
  {
    icon: Code,
    title: labels.why.useCaseHackathonTitle,
    body: labels.why.useCaseHackathonBody,
  },
  {
    icon: Briefcase,
    title: labels.why.useCaseProfessionalTitle,
    body: labels.why.useCaseProfessionalBody,
  },
  {
    icon: Trophy,
    title: labels.why.useCaseHobbiesTitle,
    body: labels.why.useCaseHobbiesBody,
  },
  {
    icon: Zap,
    title: labels.why.useCaseSpontaneousTitle,
    body: labels.why.useCaseSpontaneousBody,
  },
];

export default function WhyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">{labels.landing.loginButton}</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero / Opening */}
        <section className="flex flex-col items-center justify-center px-6 py-16 text-center lg:px-8 lg:py-24">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">
                {labels.landing.heroBadge}
              </span>
            </div>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {labels.why.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {labels.why.heroSubtitle}
          </p>
        </section>

        {/* The Small-Group Argument */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.smallGroupTitle}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {labels.why.smallGroupBody1}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {labels.why.smallGroupBody2}
            </p>
          </div>
        </section>

        {/* The Problem With Existing Tools */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.problemTitle}
            </h2>

            <div className="mt-12 space-y-6">
              {problemItems.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-lg font-medium">
              {labels.why.problemConclusion}
            </p>
          </div>
        </section>

        {/* How Mesh Is Different */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.howDifferentTitle}
            </h2>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {howDifferentItems.map((item) => (
                <div key={item.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" />
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

        {/* The Speed Pitch */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.speedTitle}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              {labels.why.speedBody}
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.useCasesTitle}
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {useCaseItems.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
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

        {/* CTA */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {labels.why.ctaTitle}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {labels.why.ctaBody}
            </p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link href="/login">
                  {labels.why.ctaButton}
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
