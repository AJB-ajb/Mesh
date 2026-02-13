/**
 * GitHub Profile Analysis using Gemini Flash
 * Analyzes extracted GitHub data to infer skills, interests, and coding style
 */

import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import type { GitHubAnalysisInput, GitHubAnalysisOutput } from "./types";

const analysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    inferredSkills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "List of technical skills inferred from code, commits, and repos. Include frameworks, tools, and practices beyond just languages.",
    },
    inferredInterests: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'List of domain interests and areas of focus (e.g., "Machine Learning", "DevOps", "Mobile Apps", "API Design")',
    },
    codingStyle: {
      type: SchemaType.STRING,
      description:
        'Brief description of coding style observed (e.g., "Clean code advocate with focus on readability", "Move fast with experimental approaches", "Test-driven with comprehensive documentation")',
    },
    collaborationStyle: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["async", "sync", "hybrid"],
      description:
        "Inferred collaboration preference based on commit patterns and communication style in commits",
    },
    experienceLevel: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["junior", "intermediate", "senior", "lead"],
      description:
        "Estimated experience level based on code complexity, project types, and patterns",
    },
    experienceSignals: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'Specific observations that indicate experience level (e.g., "Uses advanced TypeScript patterns", "Maintains popular open source project", "Consistent architectural decisions")',
    },
    suggestedBio: {
      type: SchemaType.STRING,
      description:
        "A 2-3 sentence professional bio suggestion based on the profile analysis. Make it engaging and highlight key strengths.",
    },
  },
  required: [
    "inferredSkills",
    "inferredInterests",
    "codingStyle",
    "collaborationStyle",
    "experienceLevel",
    "experienceSignals",
    "suggestedBio",
  ],
};

/**
 * Analyze GitHub profile data using Gemini
 */
export async function analyzeGitHubProfile(
  input: GitHubAnalysisInput,
): Promise<GitHubAnalysisOutput> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const prompt = buildAnalysisPrompt(input);

  const result = await generateStructuredJSON<GitHubAnalysisOutput>({
    systemPrompt: `You are an expert developer profile analyst. Your job is to analyze GitHub activity and infer:
1. Technical skills beyond just programming languages
2. Domain interests and areas of expertise
3. Coding style and practices
4. Collaboration preferences
5. Experience level with supporting evidence

Be specific and actionable. Focus on patterns that indicate real expertise.`,
    userPrompt: prompt,
    schema: analysisSchema,
    temperature: 0.3,
  });

  return {
    inferredSkills: result.inferredSkills || [],
    inferredInterests: result.inferredInterests || [],
    codingStyle: result.codingStyle || "Unknown",
    collaborationStyle: result.collaborationStyle || "hybrid",
    experienceLevel: result.experienceLevel || "intermediate",
    experienceSignals: result.experienceSignals || [],
    suggestedBio: result.suggestedBio || "",
  };
}

/**
 * Build the analysis prompt from input data
 */
function buildAnalysisPrompt(input: GitHubAnalysisInput): string {
  const parts: string[] = [];

  parts.push(`# GitHub Profile Analysis for @${input.username}`);
  parts.push("");

  // Basic stats
  parts.push("## Overview");
  parts.push(`- **Repositories analyzed:** ${input.repoCount}`);
  parts.push(`- **Total stars:** ${input.totalStars}`);
  parts.push(`- **Account age:** ${input.accountAge} years`);
  parts.push("");

  // Languages
  if (input.languages.length > 0) {
    parts.push("## Programming Languages (by usage)");
    parts.push(input.languages.join(", "));
    parts.push("");
  }

  // Topics
  if (input.topics.length > 0) {
    parts.push("## Repository Topics");
    parts.push(input.topics.join(", "));
    parts.push("");
  }

  // Repo descriptions
  if (input.repoDescriptions.length > 0) {
    parts.push("## Project Descriptions");
    for (const desc of input.repoDescriptions) {
      parts.push(`- ${desc}`);
    }
    parts.push("");
  }

  // Commit messages
  if (input.recentCommits.length > 0) {
    parts.push("## Recent Commit Messages");
    for (const commit of input.recentCommits.slice(0, 20)) {
      parts.push(`- ${commit}`);
    }
    parts.push("");
  }

  // Code snippets
  if (input.codeSnippets.length > 0) {
    parts.push("## Code Snippets from Recent Commits");
    for (const snippet of input.codeSnippets.slice(0, 5)) {
      parts.push(`### ${snippet.filePath} (${snippet.language})`);
      parts.push(`Commit: "${snippet.commitMessage}"`);
      parts.push("```");
      parts.push(snippet.content);
      parts.push("```");
      parts.push("");
    }
  }

  // README snippets
  if (input.readmeSnippets.length > 0) {
    parts.push("## README Excerpts");
    for (const readme of input.readmeSnippets.slice(0, 3)) {
      parts.push(readme.substring(0, 500));
      parts.push("---");
    }
    parts.push("");
  }

  parts.push("Based on the above data, analyze this developer's profile.");

  return parts.join("\n");
}

/**
 * Quick analysis without code snippets (faster, cheaper)
 */
export async function analyzeGitHubProfileQuick(
  input: Omit<GitHubAnalysisInput, "codeSnippets">,
): Promise<GitHubAnalysisOutput> {
  return analyzeGitHubProfile({
    ...input,
    codeSnippets: [],
  });
}

/**
 * Validate analysis output
 */
export function validateAnalysisOutput(output: GitHubAnalysisOutput): boolean {
  return (
    Array.isArray(output.inferredSkills) &&
    Array.isArray(output.inferredInterests) &&
    typeof output.codingStyle === "string" &&
    ["async", "sync", "hybrid"].includes(output.collaborationStyle) &&
    ["junior", "intermediate", "senior", "lead"].includes(
      output.experienceLevel,
    ) &&
    Array.isArray(output.experienceSignals) &&
    typeof output.suggestedBio === "string"
  );
}
