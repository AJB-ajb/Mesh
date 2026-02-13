/**
 * Discord Profile Extractor for MeshIt
 *
 * This script extracts profile information from Discord messages and creates
 * user accounts in Supabase. Designed for hackathon bulk onboarding.
 *
 * Usage:
 *   1. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in .env
 *   2. Run: npx tsx scripts/discord-profile-extractor.ts
 *   3. Provide channel ID when prompted
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not set");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Supabase environment variables not set");
  process.exit(1);
}

// Initialize Supabase client with service role key (can create users)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface DiscordMessage {
  author: {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string;
  };
  content: string;
  timestamp: string;
}

interface ExtractedProfile {
  full_name?: string;
  headline?: string;
  bio?: string;
  location?: string;
  experience_level?: "junior" | "intermediate" | "senior" | "lead";
  collaboration_style?: "async" | "sync" | "hybrid";
  availability_hours?: number;
  skills?: string[];
  interests?: string[];
  portfolio_url?: string;
  github_url?: string;
  project_preferences?: {
    project_types?: string[];
    preferred_roles?: string[];
    preferred_stack?: string[];
    commitment_level?: string;
    timeline_preference?: string;
  };
}

/**
 * Extract profile data from Discord messages using OpenAI
 */
async function extractProfileFromMessages(
  messages: DiscordMessage[],
): Promise<ExtractedProfile> {
  // Combine all messages from the user into a single text
  const combinedText = messages
    .map(
      (msg) =>
        `[${new Date(msg.timestamp).toLocaleDateString()}] ${msg.author.username}: ${msg.content}`,
    )
    .join("\n");

  const profileSchema = {
    type: "object",
    properties: {
      full_name: {
        type: "string",
        description:
          "The person's full name or Discord username if real name not mentioned",
      },
      headline: {
        type: "string",
        description:
          "A short professional headline (e.g., 'Full-stack Developer' or 'Senior React Engineer')",
      },
      bio: {
        type: "string",
        description:
          "A brief bio or summary about the person based on their messages",
      },
      location: {
        type: "string",
        description: "Location or timezone if mentioned",
      },
      experience_level: {
        type: "string",
        enum: ["junior", "intermediate", "senior", "lead"],
        description:
          "Inferred experience level based on their messages and skills",
      },
      collaboration_style: {
        type: "string",
        enum: ["async", "sync", "hybrid"],
        description:
          'Preferred collaboration style if mentioned, default to "hybrid"',
      },
      availability_hours: {
        type: "number",
        description: "Hours per week available for projects if mentioned",
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description:
          "List of technical skills, programming languages, frameworks, and tools mentioned",
      },
      interests: {
        type: "array",
        items: { type: "string" },
        description:
          "Areas of interest (e.g., AI, fintech, gaming, education) based on their messages",
      },
      portfolio_url: {
        type: "string",
        description: "Portfolio website URL if mentioned",
      },
      github_url: {
        type: "string",
        description: "GitHub profile URL if mentioned",
      },
      project_preferences: {
        type: "object",
        properties: {
          project_types: {
            type: "array",
            items: { type: "string" },
            description:
              "Types of projects interested in (e.g., SaaS, hackathon, open source)",
          },
          preferred_roles: {
            type: "array",
            items: { type: "string" },
            description:
              "Preferred roles (e.g., Frontend, Backend, Full-stack, DevOps)",
          },
          preferred_stack: {
            type: "array",
            items: { type: "string" },
            description: "Preferred tech stack mentioned",
          },
        },
      },
    },
    required: [],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting developer profile information from Discord chat messages.
Extract as much relevant information as possible from the provided Discord messages.
Be thorough in extracting skills - look for programming languages, frameworks, tools, and technologies.
Infer experience level from context (years of experience, complexity of topics discussed).
If information is not explicitly stated, make reasonable inferences based on context.
Return only the extracted data, do not make up information that cannot be inferred.`,
        },
        {
          role: "user",
          content: `Extract profile information from these Discord messages:\n\n${combinedText}`,
        },
      ],
      functions: [
        {
          name: "extract_profile",
          description:
            "Extract developer profile information from Discord messages",
          parameters: profileSchema,
        },
      ],
      function_call: { name: "extract_profile" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const functionCall = data.choices?.[0]?.message?.function_call;

  if (!functionCall || functionCall.name !== "extract_profile") {
    throw new Error("Failed to extract profile information");
  }

  return JSON.parse(functionCall.arguments);
}

/**
 * Create or update user profile in Supabase
 */
async function createUserProfile(
  discordUser: DiscordMessage["author"],
  profile: ExtractedProfile,
): Promise<void> {
  const email = `${discordUser.username.toLowerCase().replace(/[^a-z0-9]/g, "")}_${discordUser.id}@discord-import.meshit.dev`;

  console.log(`\n📧 Creating user: ${email}`);

  // Check if user already exists
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const userExists = existingUser?.users.find((u) => u.email === email);

  let userId: string;

  if (userExists) {
    console.log(`   ✅ User already exists, updating profile...`);
    userId = userExists.id;
  } else {
    // Create new auth user
    const { data: newUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name:
            profile.full_name ||
            discordUser.global_name ||
            discordUser.username,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          imported_from: "discord",
          import_date: new Date().toISOString(),
        },
      });

    if (authError) {
      console.error(`   ❌ Error creating user:`, authError);
      throw authError;
    }

    userId = newUser.user!.id;
    console.log(`   ✅ Created auth user: ${userId}`);
  }

  // Generate embedding for skills (for semantic matching)
  let embedding: number[] | null = null;
  if (profile.skills && profile.skills.length > 0) {
    const embeddingText = [
      profile.headline,
      profile.bio,
      ...(profile.skills || []),
      ...(profile.interests || []),
    ]
      .filter(Boolean)
      .join(" ");

    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: embeddingText,
        }),
      },
    );

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      embedding = embeddingData.data[0].embedding;
      console.log(`   ✅ Generated embedding vector`);
    }
  }

  // Update or insert profile
  const profileData = {
    id: userId,
    full_name:
      profile.full_name || discordUser.global_name || discordUser.username,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    experience_level: profile.experience_level || "intermediate",
    collaboration_style: profile.collaboration_style || "hybrid",
    availability_hours: profile.availability_hours || 10,
    skills: profile.skills || [],
    interests: profile.interests || [],
    portfolio_url: profile.portfolio_url,
    github_url: profile.github_url,
    project_preferences: profile.project_preferences || {},
    embedding: embedding ? `[${embedding.join(",")}]` : null,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileData, { onConflict: "id" });

  if (profileError) {
    console.error(`   ❌ Error saving profile:`, profileError);
    throw profileError;
  }

  console.log(`   ✅ Profile saved successfully`);
  console.log(`   📋 Skills: ${profile.skills?.join(", ") || "None"}`);
  console.log(`   🎯 Interests: ${profile.interests?.join(", ") || "None"}`);
}

/**
 * Process Discord messages and create profiles
 */
async function processDiscordMessages(
  messages: DiscordMessage[],
): Promise<void> {
  console.log(`\n🔍 Processing ${messages.length} Discord messages...\n`);

  // Group messages by user
  const messagesByUser = messages.reduce(
    (acc, msg) => {
      const userId = msg.author.id;
      if (!acc[userId]) {
        acc[userId] = {
          author: msg.author,
          messages: [],
        };
      }
      acc[userId].messages.push(msg);
      return acc;
    },
    {} as Record<
      string,
      { author: DiscordMessage["author"]; messages: DiscordMessage[] }
    >,
  );

  const users = Object.values(messagesByUser);
  console.log(`👥 Found ${users.length} unique users\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const { author, messages: userMessages } of users) {
    try {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 Processing: ${author.global_name || author.username}`);
      console.log(`   Messages: ${userMessages.length}`);

      // Extract profile from messages
      const profile = await extractProfileFromMessages(userMessages);

      // Create/update user in Supabase
      await createUserProfile(author, profile);

      successCount++;
    } catch (error) {
      console.error(`\n❌ Error processing ${author.username}:`, error);
      errorCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✨ Processing complete!`);
  console.log(`   ✅ Success: ${successCount} profiles`);
  console.log(`   ❌ Errors: ${errorCount} profiles`);
}

/**
 * Main function - Interactive mode
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        Discord Profile Extractor for MeshIt              ║
║                                                           ║
║  Extracts profile info from Discord messages and         ║
║  creates user accounts in Supabase                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  console.log(`\n⚠️  MANUAL INPUT MODE\n`);
  console.log(
    `Since Discord MCP is accessed through Claude Code, please provide the messages manually.`,
  );
  console.log(`\nExample message format (JSON array):`);
  console.log(`[
  {
    "author": {
      "id": "123456789",
      "username": "john_dev",
      "global_name": "John Developer"
    },
    "content": "Hey! I'm a full-stack developer with 5 years of experience in React and Node.js",
    "timestamp": "2026-02-01T10:00:00Z"
  }
]`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    '\n📝 Paste Discord messages JSON (or type "demo" for demo data): ',
    async (input) => {
      rl.close();

      try {
        let messages: DiscordMessage[];

        if (input.trim().toLowerCase() === "demo") {
          // Demo data for testing
          messages = [
            {
              author: {
                id: "123456789",
                username: "alice_dev",
                global_name: "Alice Chen",
              },
              content:
                "Hi everyone! I'm Alice, a senior full-stack developer with 6 years of experience. I specialize in React, TypeScript, Node.js, and PostgreSQL. I love working on SaaS products and have a strong interest in AI and machine learning. Looking for weekend hackathon projects!",
              timestamp: "2026-02-01T10:00:00Z",
            },
            {
              author: {
                id: "987654321",
                username: "bob_designer",
                global_name: "Bob Martinez",
              },
              content:
                "Hey! I'm Bob, a UI/UX designer and frontend developer. I work with Figma, React, and Tailwind CSS. I have 3 years of experience and I'm passionate about creating beautiful, accessible interfaces. Open to collaborating 10-15 hours per week on open source projects.",
              timestamp: "2026-02-01T11:00:00Z",
            },
            {
              author: {
                id: "555555555",
                username: "charlie_ml",
                global_name: "Charlie Kim",
              },
              content:
                "What's up! Charlie here. I'm a machine learning engineer focused on computer vision and NLP. Python, PyTorch, TensorFlow are my go-to tools. I have a PhD in CS and 8+ years in the field. Looking for impactful AI projects, especially in healthcare or education. GitHub: github.com/charliekim",
              timestamp: "2026-02-01T12:00:00Z",
            },
          ];
          console.log(`\n🎭 Using demo data with 3 sample users`);
        } else {
          messages = JSON.parse(input);
        }

        await processDiscordMessages(messages);
      } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
      }
    },
  );
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  processDiscordMessages,
  extractProfileFromMessages,
  createUserProfile,
};
