import { Check } from "lucide-react";

import { labels } from "@/lib/labels";

type Scenario =
  (typeof labels.landing.scenarios)[keyof typeof labels.landing.scenarios];

export function ScenarioComparison({ scenario }: { scenario: Scenario }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Scenario header */}
      <div className="border-b border-border bg-muted/40 px-6 py-4">
        <h3 className="text-lg font-semibold">
          <span className="mr-2">{scenario.emoji}</span>
          {scenario.title}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            &mdash; {scenario.subtitle}
          </span>
        </h3>
      </div>

      {/* Side-by-side panels */}
      <div className="grid md:grid-cols-2">
        {/* Without Mesh */}
        <div className="border-b border-border p-5 md:border-b-0 md:border-r">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {labels.landing.scenarioWithoutMesh}
          </p>
          <div className="space-y-2">
            {scenario.without.map((msg, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 font-medium text-muted-foreground/70">
                  {msg.sender}:
                </span>
                <span className="text-muted-foreground">{msg.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* With Mesh */}
        <div className="p-5">
          <p className="mb-3 text-sm font-medium text-primary">
            {labels.landing.scenarioWithMesh}
          </p>
          <ol className="space-y-3">
            {scenario.withMeshSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.6875rem] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 border-t border-border text-center text-sm">
        <div className="border-r border-border px-4 py-3 text-muted-foreground">
          {scenario.statsBefore.messages}, {scenario.statsBefore.time}
        </div>
        <div className="flex items-center justify-center gap-1.5 px-4 py-3 font-medium text-primary">
          <Check className="size-4" />
          {scenario.statsAfter.messages}, {scenario.statsAfter.time}
        </div>
      </div>
    </div>
  );
}

export function ScenarioSection({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {labels.landing.scenarioSectionTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          {labels.landing.scenarioSectionSubtitle}
        </p>

        <div className="mt-12 space-y-8">
          {scenarios.map((scenario) => (
            <ScenarioComparison key={scenario.title} scenario={scenario} />
          ))}
        </div>
      </div>
    </section>
  );
}
