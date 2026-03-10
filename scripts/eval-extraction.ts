/**
 * Extraction Quality Evaluation Script
 *
 * Calls the real Gemini API with diverse test inputs and evaluates
 * the quality of profile and posting extraction results.
 *
 * Usage: npx tsx scripts/eval-extraction.ts [--profile] [--posting] [--case <name>]
 */

import "dotenv/config";
import { generateStructuredJSON } from "@/lib/ai/gemini";
import {
  profileExtractionSchema,
  postingExtractionSchema,
} from "@/lib/ai/extraction-schemas";
import {
  PROFILE_EXTRACT_SYSTEM_PROMPT,
  POSTING_EXTRACT_SYSTEM_PROMPT,
} from "@/lib/ai/extraction-prompts";
import type { ExtractedProfileV2 } from "@/lib/types/profile";
import type { ExtractedPosting } from "@/lib/types/posting";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "error" | "warn" | "info";

type Issue = {
  severity: Severity;
  field: string;
  message: string;
};

type TestCase<T> = {
  name: string;
  description: string;
  input: string;
  checks: (result: T, issues: Issue[]) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flag(
  issues: Issue[],
  severity: Severity,
  field: string,
  message: string,
) {
  issues.push({ severity, field, message });
}

const SEVERITY_ICON: Record<Severity, string> = {
  error: "❌",
  warn: "⚠️ ",
  info: "ℹ️ ",
};

function printResult<T>(
  tc: TestCase<T>,
  result: T,
  issues: Issue[],
  durationMs: number,
) {
  console.log("\n" + "=".repeat(80));
  console.log(`📋 ${tc.name}`);
  console.log(`   ${tc.description}`);
  console.log("-".repeat(80));
  console.log(`⏱  ${durationMs}ms`);
  console.log();

  // Print the extracted result, truncating long strings
  const display = JSON.parse(JSON.stringify(result));
  for (const [k, v] of Object.entries(display as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 120) {
      (display as Record<string, string>)[k] = v.slice(0, 117) + "...";
    }
  }
  console.log(JSON.stringify(display, null, 2));
  console.log();

  if (issues.length === 0) {
    console.log("✅ All checks passed");
  } else {
    for (const issue of issues) {
      console.log(
        `  ${SEVERITY_ICON[issue.severity]} [${issue.field}] ${issue.message}`,
      );
    }
    const errors = issues.filter((i) => i.severity === "error").length;
    const warns = issues.filter((i) => i.severity === "warn").length;
    const infos = issues.filter((i) => i.severity === "info").length;
    console.log(
      `\n  Summary: ${errors} errors, ${warns} warnings, ${infos} info`,
    );
  }
}

/** Check if a string looks like it was hallucinated (overly generic, not in input) */
function looksInvented(value: string, input: string): boolean {
  // Simple heuristic: if the value has significant words not in the input
  const inputLower = input.toLowerCase();
  const words = value
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const missing = words.filter((w) => !inputLower.includes(w));
  return missing.length > words.length * 0.6;
}

// ---------------------------------------------------------------------------
// Profile Test Cases
// ---------------------------------------------------------------------------

const PROFILE_CASES: TestCase<ExtractedProfileV2>[] = [
  {
    name: "GitHub README — full-stack dev",
    description:
      "Rich GitHub README with skills, links, location, availability",
    input: `# Hi, I'm Sarah Chen 👋

Full-stack developer based in Berlin. I love building web apps with React, TypeScript, and Node.js.
Currently working with Next.js 14 and Supabase. Previously built microservices in Go and Python.

🔧 **Tech Stack**: React, TypeScript, Node.js, Next.js, Supabase, PostgreSQL, Docker, Tailwind CSS, Go, Python
🎯 **Interests**: AI/ML, developer tools, open-source
🌍 **Languages**: English, Mandarin, German (basic)

📫 Portfolio: https://sarahchen.dev
🐙 GitHub: https://github.com/sarahchen

I'm usually free on weekday evenings after 7pm CET and most of Saturday. Not available Sunday.`,
    checks: (r, issues) => {
      if (!r.full_name?.includes("Sarah"))
        flag(
          issues,
          "error",
          "full_name",
          `Expected "Sarah Chen", got "${r.full_name}"`,
        );
      if (!r.headline)
        flag(issues, "warn", "headline", "No headline extracted");
      else if (r.headline.length > 80)
        flag(
          issues,
          "warn",
          "headline",
          `Headline too long (${r.headline.length} chars): "${r.headline}"`,
        );

      if (!r.bio) flag(issues, "warn", "bio", "No bio extracted");
      else if (r.bio.length > 500)
        flag(
          issues,
          "warn",
          "bio",
          `Bio very long (${r.bio.length} chars) — may be too verbose`,
        );

      if (!r.location?.toLowerCase().includes("berlin"))
        flag(
          issues,
          "error",
          "location",
          `Expected Berlin, got "${r.location}"`,
        );

      if (!r.skills || r.skills.length < 5)
        flag(
          issues,
          "error",
          "skills",
          `Too few skills extracted: ${r.skills?.length ?? 0} (input has ~10)`,
        );
      const expectedSkills = [
        "react",
        "typescript",
        "node",
        "next",
        "go",
        "python",
        "supabase",
        "postgresql",
        "docker",
        "tailwind",
      ];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing expected skill: ${s}`);
      }

      if (!r.interests || r.interests.length === 0)
        flag(issues, "warn", "interests", "No interests extracted");

      if (!r.languages || r.languages.length < 2)
        flag(
          issues,
          "warn",
          "languages",
          `Expected 3 languages, got ${r.languages?.length ?? 0}`,
        );

      if (!r.portfolio_url?.includes("sarahchen.dev"))
        flag(
          issues,
          "error",
          "portfolio_url",
          `Expected sarahchen.dev, got "${r.portfolio_url}"`,
        );
      if (!r.github_url?.includes("github.com/sarahchen"))
        flag(
          issues,
          "error",
          "github_url",
          `Expected github.com/sarahchen, got "${r.github_url}"`,
        );

      if (!r.timezone)
        flag(issues, "warn", "timezone", "CET/Berlin timezone not extracted");
      else if (!r.timezone.includes("Europe"))
        flag(
          issues,
          "warn",
          "timezone",
          `Expected Europe/Berlin, got "${r.timezone}"`,
        );

      if (!r.availability_windows || r.availability_windows.length === 0)
        flag(
          issues,
          "warn",
          "availability_windows",
          "No availability windows extracted",
        );
      else {
        // Should have weekday evening blocks as UNAVAILABLE before 7pm,
        // and Sunday as fully blocked
        const sundayBlocks = r.availability_windows.filter(
          (w) => w.day_of_week === 6,
        );
        if (sundayBlocks.length === 0)
          flag(
            issues,
            "warn",
            "availability_windows",
            "Sunday should be blocked (unavailable) but no Sunday windows found",
          );
      }
    },
  },

  {
    name: "Casual Discord intro",
    description: "Short, informal self-introduction",
    input: `hey everyone! im marco, 22, cs student from rome. i mostly do python and some javascript.
really into machine learning and want to get into web dev. looking for people to hack on stuff with.
i speak italian and english. hit me up!`,
    checks: (r, issues) => {
      if (!r.full_name?.toLowerCase().includes("marco"))
        flag(
          issues,
          "error",
          "full_name",
          `Expected Marco, got "${r.full_name}"`,
        );
      if (!r.location?.toLowerCase().includes("rome"))
        flag(issues, "warn", "location", `Expected Rome, got "${r.location}"`);
      if (!r.skills || r.skills.length < 2)
        flag(
          issues,
          "error",
          "skills",
          `Expected at least Python & JavaScript, got ${r.skills?.length ?? 0}`,
        );

      if (
        !r.interests?.some(
          (i) =>
            i.toLowerCase().includes("machine learning") ||
            i.toLowerCase().includes("ml"),
        )
      )
        flag(
          issues,
          "warn",
          "interests",
          "Machine learning interest not extracted",
        );
      if (!r.interests?.some((i) => i.toLowerCase().includes("web")))
        flag(
          issues,
          "info",
          "interests",
          "Web dev interest not extracted (mentioned wanting to get into it)",
        );

      if (!r.languages || r.languages.length < 2)
        flag(
          issues,
          "warn",
          "languages",
          `Expected Italian + English, got ${r.languages?.length ?? 0}`,
        );

      // Should NOT have fabricated a headline about being a "senior" anything
      if (
        r.headline?.toLowerCase().includes("senior") ||
        r.headline?.toLowerCase().includes("lead")
      )
        flag(
          issues,
          "error",
          "headline",
          `Headline overstates experience: "${r.headline}" — input is a 22yo student`,
        );

      // Bio tone check: should be casual, not overly formal
      if (
        (r.bio && r.bio.includes("seasoned")) ||
        r.bio?.includes("extensive experience")
      )
        flag(
          issues,
          "warn",
          "bio",
          `Bio tone too formal/inflated for casual student intro: "${r.bio?.slice(0, 80)}..."`,
        );
    },
  },

  {
    name: "Resume snippet — senior dev",
    description: "Formal resume with many technologies and experience levels",
    input: `Alex Thompson — Senior Software Engineer

10+ years of experience in distributed systems and cloud infrastructure.
Expert in Java, Kotlin, and Spring Boot. Proficient in AWS (EC2, Lambda, S3, DynamoDB),
Kubernetes, Terraform, and CI/CD pipelines. Working knowledge of React and TypeScript for
internal tools. Basic familiarity with Rust for performance-critical components.

Led teams of 5-8 engineers. Architected microservice platforms serving 10M+ requests/day.
Strong background in system design, mentoring, and agile methodologies.

Based in San Francisco, CA. Open to remote work.
Timezone: America/Los_Angeles`,
    checks: (r, issues) => {
      if (!r.full_name?.includes("Thompson"))
        flag(
          issues,
          "error",
          "full_name",
          `Expected Alex Thompson, got "${r.full_name}"`,
        );
      if (!r.headline)
        flag(issues, "warn", "headline", "No headline extracted");

      // Skill extraction thoroughness
      const expectedSkills = [
        "java",
        "kotlin",
        "spring",
        "aws",
        "kubernetes",
        "terraform",
        "react",
        "typescript",
        "rust",
      ];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing skill: ${s}`);
      }

      // Skill levels — should reflect the stated expertise gradations
      if (r.skill_levels) {
        const levels =
          typeof r.skill_levels === "string"
            ? JSON.parse(r.skill_levels)
            : r.skill_levels;
        flag(
          issues,
          "info",
          "skill_levels",
          `Extracted skill levels: ${JSON.stringify(levels)}`,
        );
        // Java should be higher than Rust
      } else {
        flag(
          issues,
          "info",
          "skill_levels",
          "No skill levels extracted (text has clear gradations: expert/proficient/working/basic)",
        );
      }

      if (!r.location?.toLowerCase().includes("san francisco"))
        flag(
          issues,
          "warn",
          "location",
          `Expected San Francisco, got "${r.location}"`,
        );

      if (r.timezone !== "America/Los_Angeles")
        flag(
          issues,
          "warn",
          "timezone",
          `Expected America/Los_Angeles, got "${r.timezone}"`,
        );

      // Location preference: "open to remote" → should be remote-leaning
      if (r.location_preference != null) {
        if (r.location_preference < 0.4)
          flag(
            issues,
            "warn",
            "location_preference",
            `"Open to remote" should lean remote, got ${r.location_preference}`,
          );
      }
    },
  },

  {
    name: "Minimal intro — almost nothing",
    description: "Very short text, tests hallucination resistance",
    input: `I know React and Python. Looking for projects.`,
    checks: (r, issues) => {
      if (!r.skills || r.skills.length < 2)
        flag(
          issues,
          "error",
          "skills",
          `Should extract React & Python, got ${r.skills?.length ?? 0}`,
        );
      if (r.skills && r.skills.length > 4)
        flag(
          issues,
          "warn",
          "skills",
          `Only 2 skills mentioned but ${r.skills.length} extracted — possible hallucination: ${r.skills.join(", ")}`,
        );

      // Should NOT make up a name
      if (r.full_name && r.full_name.trim().length > 0)
        flag(
          issues,
          "warn",
          "full_name",
          `Name fabricated from no input: "${r.full_name}"`,
        );

      // Should NOT invent a detailed bio
      if (r.bio && r.bio.length > 100)
        flag(
          issues,
          "warn",
          "bio",
          `Bio seems inflated for minimal input (${r.bio.length} chars): "${r.bio.slice(0, 80)}..."`,
        );

      // Should NOT hallucinate interests
      if (r.interests && r.interests.length > 2)
        flag(
          issues,
          "warn",
          "interests",
          `Too many interests for minimal input: ${r.interests.join(", ")}`,
        );
    },
  },

  {
    name: "Availability-heavy profile",
    description: "Focus on schedule extraction accuracy",
    input: `I'm Jamie, a data scientist in NYC. I work 9-5 on weekdays so I'm only free evenings and weekends.
Tuesday and Thursday evenings don't work for me because of gym. Saturday mornings I have a standing brunch.
Available: weekday evenings (except Tue/Thu), all day Sunday, Saturday afternoon onwards.
Timezone: EST`,
    checks: (r, issues) => {
      if (
        !r.timezone?.includes("New_York") &&
        !r.timezone?.includes("America/")
      )
        flag(
          issues,
          "warn",
          "timezone",
          `EST should map to America/New_York, got "${r.timezone}"`,
        );

      if (!r.availability_windows || r.availability_windows.length === 0) {
        flag(
          issues,
          "error",
          "availability_windows",
          "No unavailability windows extracted from detailed schedule",
        );
        return;
      }

      // These are UNAVAILABILITY windows. Check that:
      // - Weekday 9am-5pm (540-1020) is blocked
      // - Tuesday evening is blocked (extra)
      // - Thursday evening is blocked (extra)
      // - Saturday morning is blocked

      const windowsByDay: Record<number, typeof r.availability_windows> = {};
      for (const w of r.availability_windows) {
        if (!windowsByDay[w.day_of_week]) windowsByDay[w.day_of_week] = [];
        windowsByDay[w.day_of_week]!.push(w);
      }

      flag(
        issues,
        "info",
        "availability_windows",
        `Extracted ${r.availability_windows.length} windows across days: ${Object.keys(windowsByDay).sort().join(", ")}`,
      );

      // Tuesday (day 1) should have evening blocked
      const tue = windowsByDay[1] ?? [];
      const tueEvening = tue.some((w) => w.start_minutes >= 1020);
      if (!tueEvening)
        flag(
          issues,
          "warn",
          "availability_windows",
          "Tuesday evening should be blocked (gym) but wasn't found",
        );

      // Thursday (day 3) should have evening blocked
      const thu = windowsByDay[3] ?? [];
      const thuEvening = thu.some((w) => w.start_minutes >= 1020);
      if (!thuEvening)
        flag(
          issues,
          "warn",
          "availability_windows",
          "Thursday evening should be blocked (gym) but wasn't found",
        );

      // Saturday (day 5) morning should be blocked
      const sat = windowsByDay[5] ?? [];
      const satMorning = sat.some(
        (w) => w.start_minutes < 720 && w.end_minutes <= 720,
      );
      if (!satMorning)
        flag(
          issues,
          "warn",
          "availability_windows",
          "Saturday morning should be blocked (brunch) but wasn't found",
        );

      // Sunday (day 6) should have NO blocks (fully available)
      const sun = windowsByDay[6] ?? [];
      if (sun.length > 0)
        flag(
          issues,
          "warn",
          "availability_windows",
          `Sunday should be fully available but has ${sun.length} blocked windows`,
        );
    },
  },

  {
    name: "German-language profile",
    description: "Non-English input, tests language handling",
    input: `Hi, ich bin Lena aus München. Ich studiere Informatik und arbeite als Werkstudentin bei Siemens.
Meine Skills: Java, Spring Boot, Angular, SQL. Ich interessiere mich für IoT und embedded systems.
Ich spreche Deutsch, Englisch und ein bisschen Französisch.
Portfolio: https://lena-dev.de`,
    checks: (r, issues) => {
      if (!r.full_name?.includes("Lena"))
        flag(
          issues,
          "error",
          "full_name",
          `Expected Lena, got "${r.full_name}"`,
        );

      if (
        !r.location?.toLowerCase().includes("münchen") &&
        !r.location?.toLowerCase().includes("munich")
      )
        flag(
          issues,
          "warn",
          "location",
          `Expected München/Munich, got "${r.location}"`,
        );

      const expectedSkills = ["java", "spring", "angular", "sql"];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing skill: ${s}`);
      }

      if (!r.languages || r.languages.length < 3)
        flag(
          issues,
          "warn",
          "languages",
          `Expected 3 languages (de, en, fr), got ${r.languages?.length ?? 0}: ${r.languages?.join(", ")}`,
        );

      // Bio should ideally be in English (extracted/translated), not raw German
      // Or if in German, that's fine too — just flag for review
      if (r.bio) {
        const isGerman = r.bio.includes("ich") || r.bio.includes("und");
        flag(
          issues,
          "info",
          "bio",
          `Bio language: ${isGerman ? "German (kept original)" : "English (translated)"} — "${r.bio.slice(0, 80)}..."`,
        );
      }

      if (!r.portfolio_url?.includes("lena-dev.de"))
        flag(
          issues,
          "error",
          "portfolio_url",
          `Expected lena-dev.de, got "${r.portfolio_url}"`,
        );

      if (!r.interests?.some((i) => i.toLowerCase().includes("iot")))
        flag(issues, "warn", "interests", "IoT interest not extracted");
    },
  },
];

// ---------------------------------------------------------------------------
// Posting Test Cases
// ---------------------------------------------------------------------------

const POSTING_CASES: TestCase<ExtractedPosting>[] = [
  {
    name: "Hackathon team pitch",
    description: "Energetic hackathon post with specific tech and timeline",
    input: `🚀 Looking for 2-3 people to join my team for HackMIT 2026! We're building an AI-powered
study planner that uses GPT-4 to generate personalized study schedules. Need someone with React/Next.js
for the frontend, and someone who knows Python + LangChain for the AI pipeline. Bonus if you have
experience with vector databases (Pinecone, Weaviate). The hackathon is in 3 weeks, so we'd need to
start planning ASAP. I'll handle the backend (FastAPI + PostgreSQL).

We can meet Tuesday and Thursday evenings 7-10pm EST to plan before the event.`,
    checks: (r, issues) => {
      if (!r.title) flag(issues, "error", "title", "No title extracted");
      else {
        if (r.title.length > 100)
          flag(
            issues,
            "warn",
            "title",
            `Title too long (${r.title.length} chars): "${r.title}"`,
          );
        if (r.title.startsWith("#"))
          flag(
            issues,
            "error",
            "title",
            `Title has markdown syntax: "${r.title}"`,
          );
      }

      if (r.category !== "hackathon")
        flag(
          issues,
          "error",
          "category",
          `Expected "hackathon", got "${r.category}"`,
        );

      if (!r.context_identifier?.includes("HackMIT"))
        flag(
          issues,
          "warn",
          "context_identifier",
          `Expected HackMIT 2026, got "${r.context_identifier}"`,
        );

      // Team size
      if (r.team_size_min != null && r.team_size_min > 3)
        flag(
          issues,
          "warn",
          "team_size_min",
          `"2-3 people" + poster = 3-4 total, min seems high: ${r.team_size_min}`,
        );
      if (r.team_size_max != null && r.team_size_max > 5)
        flag(
          issues,
          "warn",
          "team_size_max",
          `Team max seems too high for "2-3 people": ${r.team_size_max}`,
        );

      // Skills — should include both frontend and backend + AI skills
      const expectedSkills = [
        "react",
        "next",
        "python",
        "langchain",
        "fastapi",
        "postgresql",
      ];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing expected skill: ${s}`);
      }

      if (r.visibility !== "public")
        flag(
          issues,
          "warn",
          "visibility",
          `Expected public (no specific invitees), got "${r.visibility}"`,
        );

      // Scheduling
      if (r.availability_mode !== "recurring")
        flag(
          issues,
          "warn",
          "availability_mode",
          `Expected "recurring" (Tue/Thu evenings), got "${r.availability_mode}"`,
        );

      if (r.availability_windows && r.availability_windows.length > 0) {
        // Tuesday = day 1, Thursday = day 3
        const days = r.availability_windows.map((w) => w.day_of_week);
        if (!days.includes(1))
          flag(
            issues,
            "warn",
            "availability_windows",
            "Tuesday not in availability windows",
          );
        if (!days.includes(3))
          flag(
            issues,
            "warn",
            "availability_windows",
            "Thursday not in availability windows",
          );
      } else if (r.availability_mode === "recurring") {
        flag(
          issues,
          "warn",
          "availability_windows",
          "Mode is recurring but no windows extracted",
        );
      }

      if (
        !r.timezone?.includes("New_York") &&
        !r.timezone?.includes("America/")
      )
        flag(
          issues,
          "warn",
          "timezone",
          `EST should be America/New_York, got "${r.timezone}"`,
        );
    },
  },

  {
    name: "Study group — casual",
    description: "Informal study group request for a university course",
    input: `anyone else struggling with cs301 algorithms? looking for a study buddy or small group to
work through the problem sets together. midterm is in 2 weeks. i'm decent at dynamic programming but
need help with graph algorithms. would be cool to meet at the library or on zoom, whatever works.`,
    checks: (r, issues) => {
      if (r.category !== "study")
        flag(
          issues,
          "error",
          "category",
          `Expected "study", got "${r.category}"`,
        );

      if (
        !r.context_identifier?.toLowerCase().includes("cs301") &&
        !r.context_identifier?.toLowerCase().includes("cs 301")
      )
        flag(
          issues,
          "warn",
          "context_identifier",
          `Expected CS301, got "${r.context_identifier}"`,
        );

      if (!r.description)
        flag(issues, "error", "description", "No description extracted");
      else if (r.description.length < 20)
        flag(
          issues,
          "warn",
          "description",
          `Description too short: "${r.description}"`,
        );

      // Tone check: description should remain casual, not corporate
      if (
        r.description?.includes("seeking") &&
        r.description?.includes("collaboration")
      )
        flag(
          issues,
          "warn",
          "description",
          `Tone too formal for casual student post: "${r.description.slice(0, 80)}..."`,
        );

      // Skills should mention algorithms-related topics
      if (
        !r.skills?.some(
          (s) =>
            s.toLowerCase().includes("algorithm") ||
            s.toLowerCase().includes("dynamic programming") ||
            s.toLowerCase().includes("graph"),
        )
      )
        flag(
          issues,
          "warn",
          "skills",
          `Should extract algorithm-related skills, got: ${r.skills?.join(", ")}`,
        );

      if (r.visibility !== "public")
        flag(
          issues,
          "warn",
          "visibility",
          `Expected public, got "${r.visibility}"`,
        );

      // Team size should be small
      if (r.team_size_max && r.team_size_max > 6)
        flag(
          issues,
          "warn",
          "team_size_max",
          `"Study buddy or small group" — max seems too high: ${r.team_size_max}`,
        );
    },
  },

  {
    name: "Professional project — formal",
    description: "Formal project posting with detailed requirements",
    input: `We're looking for a senior frontend developer to help build the dashboard for our climate data
visualization platform. The project is funded by a university research grant and will run for approximately
6 months.

Requirements:
- Strong React/TypeScript experience (3+ years)
- D3.js or similar data visualization library
- Experience with large datasets and WebGL for map rendering
- Familiarity with scientific data formats (NetCDF, GeoJSON)
- Good communication skills for working with non-technical researchers

Nice to have:
- Python for data preprocessing
- Docker for deployment
- CI/CD pipeline experience

Team: 2 developers + 3 researchers. Compensation available.`,
    checks: (r, issues) => {
      if (r.category !== "professional")
        flag(
          issues,
          "error",
          "category",
          `Expected "professional", got "${r.category}"`,
        );

      if (!r.title) flag(issues, "error", "title", "No title extracted");
      else {
        // Title should mention climate/data/dashboard, not be generic
        const titleLower = r.title.toLowerCase();
        const relevant =
          titleLower.includes("climate") ||
          titleLower.includes("data") ||
          titleLower.includes("dashboard") ||
          titleLower.includes("visualization");
        if (!relevant)
          flag(
            issues,
            "warn",
            "title",
            `Title doesn't capture the project focus: "${r.title}"`,
          );
      }

      if (
        !r.estimated_time?.includes("6") &&
        !r.estimated_time?.toLowerCase().includes("month")
      )
        flag(
          issues,
          "warn",
          "estimated_time",
          `Expected ~6 months, got "${r.estimated_time}"`,
        );

      // Skills: both required and nice-to-have
      const requiredSkills = ["react", "typescript", "d3"];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of requiredSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "error", "skills", `Missing required skill: ${s}`);
      }

      // Should also pick up WebGL, GeoJSON etc
      const niceSkills = ["python", "docker", "webgl"];
      for (const s of niceSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(
            issues,
            "info",
            "skills",
            `Nice-to-have skill not extracted: ${s}`,
          );
      }

      // Team size
      if (r.team_size_min != null && r.team_size_min > 5)
        flag(
          issues,
          "warn",
          "team_size_min",
          `"2 developers + 3 researchers" = 5, min seems off: ${r.team_size_min}`,
        );

      if (r.visibility !== "public")
        flag(
          issues,
          "warn",
          "visibility",
          `Expected public, got "${r.visibility}"`,
        );
    },
  },

  {
    name: "Private post with invitees",
    description:
      "Post mentioning specific people — should trigger private visibility",
    input: `Hey, I want to start a side project with Alex and Jordan — a mobile app for tracking shared
expenses (like Splitwise but simpler). Thinking React Native + Firebase. Alex, you'd handle the backend,
Jordan, you do the UI, and I'll do the auth and payments integration. Let's aim to have an MVP in a month.`,
    checks: (r, issues) => {
      if (r.visibility !== "private")
        flag(
          issues,
          "error",
          "visibility",
          `Mentions specific people — expected "private", got "${r.visibility}"`,
        );

      if (!r.invitees || r.invitees.length < 2)
        flag(
          issues,
          "error",
          "invitees",
          `Should extract Alex and Jordan, got: ${r.invitees?.join(", ") ?? "none"}`,
        );
      else {
        if (!r.invitees.some((n) => n.toLowerCase().includes("alex")))
          flag(issues, "error", "invitees", "Alex not in invitees");
        if (!r.invitees.some((n) => n.toLowerCase().includes("jordan")))
          flag(issues, "error", "invitees", "Jordan not in invitees");
      }

      // Description should NOT contain invitee assignment phrases
      if (r.description?.includes("Alex") || r.description?.includes("Jordan"))
        flag(
          issues,
          "warn",
          "description",
          "Description still contains invitee names — should be stripped",
        );

      if (r.category !== "personal")
        flag(
          issues,
          "info",
          "category",
          `Side project could be "personal", got "${r.category}"`,
        );

      const expectedSkills = ["react native", "firebase"];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing skill: ${s}`);
      }
    },
  },

  {
    name: "Minimal Slack message",
    description: "Very short message, tests extraction from minimal context",
    input: `need a backend dev for my flutter app, anyone interested? using dart + supabase`,
    checks: (r, issues) => {
      if (!r.title) flag(issues, "error", "title", "No title generated");

      if (!r.description)
        flag(issues, "error", "description", "No description generated");
      else if (r.description.length > 300)
        flag(
          issues,
          "warn",
          "description",
          `Description too verbose for a one-liner input (${r.description.length} chars)`,
        );

      const expectedSkills = ["flutter", "dart", "supabase"];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "error", "skills", `Missing skill: ${s}`);
      }

      // Should NOT fabricate detailed requirements
      if (r.team_size_max && r.team_size_max > 5)
        flag(
          issues,
          "warn",
          "team_size_max",
          `No team size mentioned, max seems fabricated: ${r.team_size_max}`,
        );

      if (
        r.estimated_time &&
        looksInvented(r.estimated_time, "need a backend dev for my flutter app")
      )
        flag(
          issues,
          "info",
          "estimated_time",
          `Estimated time might be fabricated: "${r.estimated_time}"`,
        );
    },
  },

  {
    name: "Social/fun posting",
    description: "Non-technical social posting",
    input: `🎮 Looking for people to join a weekly game dev jam! We pick a theme each week, spend the
weekend building something fun in Godot or Unity, then share and give feedback on Sunday evening.
No experience needed — it's about learning and having fun. We usually meet on Discord Saturday 10am-6pm
and Sunday 2pm-8pm. Currently 4 people, room for 3-4 more.`,
    checks: (r, issues) => {
      if (r.category !== "social" && r.category !== "personal")
        flag(
          issues,
          "info",
          "category",
          `Expected "social" or "personal", got "${r.category}"`,
        );

      const expectedSkills = ["godot", "unity"];
      const extractedLower = (r.skills ?? []).map((s) => s.toLowerCase());
      for (const s of expectedSkills) {
        if (!extractedLower.some((e) => e.includes(s)))
          flag(issues, "warn", "skills", `Missing skill: ${s}`);
      }

      // Team size: currently 4, room for 3-4 more → max ~8
      if (
        r.team_size_max != null &&
        (r.team_size_max < 6 || r.team_size_max > 10)
      )
        flag(
          issues,
          "warn",
          "team_size_max",
          `"Currently 4, room for 3-4 more" ≈ 7-8 total, got max: ${r.team_size_max}`,
        );

      // Scheduling
      if (r.availability_mode !== "recurring")
        flag(
          issues,
          "warn",
          "availability_mode",
          `Expected "recurring" (weekly schedule), got "${r.availability_mode}"`,
        );

      if (r.availability_windows && r.availability_windows.length > 0) {
        const days = r.availability_windows.map((w) => w.day_of_week);
        if (!days.includes(5))
          flag(
            issues,
            "warn",
            "availability_windows",
            "Saturday not in windows",
          );
        if (!days.includes(6))
          flag(issues, "warn", "availability_windows", "Sunday not in windows");
      }

      // Description tone should be fun/casual
      if (
        r.description?.includes("enterprise") ||
        r.description?.includes("stakeholder")
      )
        flag(
          issues,
          "warn",
          "description",
          "Tone too formal for a fun/social posting",
        );
    },
  },

  {
    name: "Verbose project README",
    description: "Long detailed text — tests whether extraction stays concise",
    input: `# Open Source Carbon Footprint Tracker

## Overview
We're building an open-source web application that helps individuals and small businesses track their
carbon footprint. The app will integrate with utility providers, transportation APIs, and shopping
receipts to automatically calculate emissions. Users can set goals, track progress, and get personalized
suggestions for reducing their impact.

## Tech Stack
- **Frontend**: React 19, Next.js 15, TypeScript, Tailwind CSS, Recharts for data viz
- **Backend**: Node.js, tRPC, Prisma ORM
- **Database**: PostgreSQL with PostGIS for geospatial data
- **Infrastructure**: Docker, GitHub Actions CI/CD, Vercel for deployment
- **APIs**: Carbon Interface API, Google Maps API, Plaid for financial data

## What We Need
We're looking for 2-4 contributors who are passionate about climate tech:
1. A frontend developer comfortable with React and data visualization
2. A backend developer who can work with APIs and data processing
3. (Optional) A UX/UI designer
4. (Optional) A data scientist for emissions modeling

## Timeline
This is an ongoing open-source project. We aim to have v1.0 ready within 3 months with core tracking
features. Long-term, we want to build a community around sustainable tech.

## How to Join
This is a fully remote, asynchronous project. We coordinate via Discord and have optional weekly
sync calls on Wednesday evenings at 7pm UTC. All skill levels welcome — great opportunity to build
your open-source portfolio.`,
    checks: (r, issues) => {
      if (!r.title) flag(issues, "error", "title", "No title extracted");
      else if (r.title.length > 100)
        flag(issues, "warn", "title", `Title too long: "${r.title}"`);

      if (!r.description)
        flag(issues, "error", "description", "No description extracted");

      // Should extract many skills
      if (!r.skills || r.skills.length < 8)
        flag(
          issues,
          "warn",
          "skills",
          `Input lists ~15 technologies, only ${r.skills?.length ?? 0} extracted`,
        );

      // Team size
      if (r.team_size_min != null && r.team_size_min < 2)
        flag(
          issues,
          "warn",
          "team_size_min",
          `"2-4 contributors", got min: ${r.team_size_min}`,
        );
      if (r.team_size_max != null && r.team_size_max > 6)
        flag(
          issues,
          "warn",
          "team_size_max",
          `"2-4 contributors", got max: ${r.team_size_max}`,
        );

      if (
        !r.estimated_time?.includes("3") &&
        !r.estimated_time?.toLowerCase().includes("month") &&
        !r.estimated_time?.toLowerCase().includes("ongoing")
      )
        flag(
          issues,
          "info",
          "estimated_time",
          `Expected ~3 months or ongoing, got "${r.estimated_time}"`,
        );

      // Tags should include "open-source"
      if (
        !r.tags?.some(
          (t) =>
            t.toLowerCase().includes("open") ||
            t.toLowerCase().includes("source") ||
            t.toLowerCase().includes("climate"),
        )
      )
        flag(
          issues,
          "info",
          "tags",
          `Expected open-source/climate tags, got: ${r.tags?.join(", ")}`,
        );

      if (r.category !== "personal" && r.category !== "social")
        flag(
          issues,
          "info",
          "category",
          `Open-source project → personal or social, got "${r.category}"`,
        );
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runProfileCase(tc: TestCase<ExtractedProfileV2>) {
  const start = Date.now();
  const result = await generateStructuredJSON<ExtractedProfileV2>({
    systemPrompt: PROFILE_EXTRACT_SYSTEM_PROMPT,
    userPrompt: `Extract profile information from this text:\n\n${tc.input}`,
    schema: profileExtractionSchema("extract"),
    temperature: 0.3,
  });
  const duration = Date.now() - start;

  const issues: Issue[] = [];
  tc.checks(result, issues);
  printResult(tc, result, issues, duration);
  return issues;
}

async function runPostingCase(tc: TestCase<ExtractedPosting>) {
  const start = Date.now();
  const result = await generateStructuredJSON<ExtractedPosting>({
    systemPrompt: POSTING_EXTRACT_SYSTEM_PROMPT,
    userPrompt: `Extract posting information from this text:\n\n${tc.input}`,
    schema: postingExtractionSchema("extract"),
    temperature: 0.3,
  });
  const duration = Date.now() - start;

  const issues: Issue[] = [];
  tc.checks(result, issues);
  printResult(tc, result, issues, duration);
  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  const filterCase = args.includes("--case")
    ? args[args.indexOf("--case") + 1]?.toLowerCase()
    : null;
  const runProfile = args.length === 0 || args.includes("--profile");
  const runPosting = args.length === 0 || args.includes("--posting");

  let totalErrors = 0;
  let totalWarns = 0;
  let totalInfos = 0;
  let totalCases = 0;

  if (runProfile) {
    console.log("\n" + "█".repeat(80));
    console.log("  PROFILE EXTRACTION EVALUATION");
    console.log("█".repeat(80));

    for (const tc of PROFILE_CASES) {
      if (filterCase && !tc.name.toLowerCase().includes(filterCase)) continue;
      try {
        const issues = await runProfileCase(tc);
        totalErrors += issues.filter((i) => i.severity === "error").length;
        totalWarns += issues.filter((i) => i.severity === "warn").length;
        totalInfos += issues.filter((i) => i.severity === "info").length;
        totalCases++;
      } catch (err) {
        console.error(`\n❌ FAILED: ${tc.name} — ${err}`);
        totalErrors++;
        totalCases++;
      }
    }
  }

  if (runPosting) {
    console.log("\n" + "█".repeat(80));
    console.log("  POSTING EXTRACTION EVALUATION");
    console.log("█".repeat(80));

    for (const tc of POSTING_CASES) {
      if (filterCase && !tc.name.toLowerCase().includes(filterCase)) continue;
      try {
        const issues = await runPostingCase(tc);
        totalErrors += issues.filter((i) => i.severity === "error").length;
        totalWarns += issues.filter((i) => i.severity === "warn").length;
        totalInfos += issues.filter((i) => i.severity === "info").length;
        totalCases++;
      } catch (err) {
        console.error(`\n❌ FAILED: ${tc.name} — ${err}`);
        totalErrors++;
        totalCases++;
      }
    }
  }

  // Final summary
  console.log("\n" + "█".repeat(80));
  console.log("  FINAL SUMMARY");
  console.log("█".repeat(80));
  console.log(`  Cases run: ${totalCases}`);
  console.log(`  ❌ Errors:   ${totalErrors}`);
  console.log(`  ⚠️  Warnings: ${totalWarns}`);
  console.log(`  ℹ️  Info:     ${totalInfos}`);
  console.log("█".repeat(80));

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
