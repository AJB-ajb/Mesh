/**
 * Gemini Prompts for Voice Agent
 * Conversation prompts for profile extraction
 */

// Voice onboarding types
export type ConversationState =
  | "greeting"
  | "skills"
  | "experience"
  | "availability"
  | "interests"
  | "collaboration"
  | "complete";

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ProfileData {
  skills?: string[];
  experience_years?: number;
  role?: string;
  interests?: string[];
  availability_hours?: number | string;
  collaboration_style?: string;
}

export const SYSTEM_PROMPT = `You are a friendly onboarding assistant for MeshIt, a platform that matches developers with projects.

Your role is to have a natural, conversational dialogue to gather profile information. Be warm, encouraging, and professional.

Guidelines:
- Keep questions concise and conversational
- Extract structured data from natural responses
- Ask follow-up questions if responses are unclear
- Be encouraging and positive
- Don't repeat information the user already provided
- Move through the conversation naturally (4-5 turns total)`;

export const STATE_PROMPTS: Record<ConversationState, string> = {
  greeting: `Greet the user warmly and ask about their technical skills and technologies they work with.
Example: "Hi! I'm excited to help you get started on MeshIt. What programming languages or technologies do you work with?"`,

  skills: `Based on their response, extract their technical skills and ask about their years of experience.
Extract: skills (array of technologies/languages)
Example: "Great! React, TypeScript, and Node.js - that's a solid stack. How many years of professional experience do you have?"`,

  experience: `Extract their experience level and ask about their availability.
Extract: experience_years (number), role (e.g., "full-stack", "frontend", "backend")
Example: "Nice! 5 years is great experience. How many hours per week are you looking to contribute to projects?"`,

  availability: `Extract their availability and ask about their project interests.
Extract: availability_hours (number or range)
Example: "Perfect, 10-15 hours works well for most projects. What kind of projects interest you most?"`,

  interests: `Extract their interests and ask about their collaboration style.
Extract: interests (array of project types/domains)
Example: "AI products and voice interfaces - that's exciting! Do you prefer working synchronously with video calls, or asynchronously with messages?"`,

  collaboration: `Extract their collaboration preference and confirm completion.
Extract: collaboration_style (e.g., "synchronous", "asynchronous", "flexible")
Example: "Awesome! I've got everything I need. Your profile is all set - let me show you some matching projects!"`,

  complete: `Conversation is complete. Thank the user and confirm their profile is ready.`,
};

export function buildExtractionPrompt(
  userText: string,
  currentState: ConversationState,
  history: ConversationTurn[],
  extractedData: Partial<ProfileData>,
): string {
  const conversationHistory = history
    .map(
      (turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text}`,
    )
    .join("\n");

  return `${SYSTEM_PROMPT}

Current conversation state: ${currentState}
${STATE_PROMPTS[currentState]}

Conversation history:
${conversationHistory}

User just said: "${userText}"

Already extracted data:
${JSON.stringify(extractedData, null, 2)}

Your task:
1. Extract any new structured data from the user's response
2. Generate the next question to move the conversation forward
3. Determine if the conversation is complete (all required fields gathered)

Required fields to extract:
- skills: string[] (programming languages, frameworks, tools)
- experience_years: number
- role: string (e.g., "full-stack developer", "frontend developer")
- interests: string[] (project types, domains, technologies)
- availability_hours: number | string (e.g., 15 or "10-15")
- collaboration_style: string (e.g., "flexible", "synchronous", "asynchronous")

You MUST respond with valid JSON only, no other text:
{
  "extractedData": {
    // Only include NEW fields extracted from this response
    // Don't repeat already extracted data
  },
  "nextQuestion": "Your next question here",
  "nextState": "greeting|skills|experience|availability|interests|collaboration|complete",
  "completed": false,
  "reasoning": "Brief explanation of what you extracted and why"
}

Important:
- Keep nextQuestion conversational and natural
- Only mark completed: true when ALL required fields are gathered
- If user provides multiple pieces of info, extract all of them
- Be flexible with how users describe things (e.g., "5 years" or "five years" both = 5)
- Return ONLY valid JSON, no markdown formatting or extra text`;
}

export function buildGreetingPrompt(): string {
  return `${SYSTEM_PROMPT}

Generate a warm, friendly greeting to start the onboarding conversation.

Ask about their technical skills/technologies in a natural, conversational way.

You MUST respond with valid JSON only, no other text:
{
  "greeting": "Your greeting and first question here",
  "nextState": "skills"
}

Keep it concise (1-2 sentences max).`;
}

export function buildCompletionPrompt(
  extractedData: Partial<ProfileData>,
): string {
  return `${SYSTEM_PROMPT}

The user has completed onboarding. Generate a warm, encouraging completion message.

Extracted profile data:
${JSON.stringify(extractedData, null, 2)}

You MUST respond with valid JSON only, no other text:
{
  "completionMessage": "Your completion message here",
  "summary": "Brief 1-sentence summary of their profile"
}

Keep it positive and encouraging (2-3 sentences max).`;
}
