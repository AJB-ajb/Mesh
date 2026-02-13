/**
 * Batch Discord Message Importer for MeshIt Hackathon
 *
 * Paste Discord messages below and run: set -a && source .env && set +a && npx tsx scripts/batch-discord-import.ts
 */

import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// PASTE YOUR DISCORD MESSAGES HERE:
// Format: "Username — Date: message content"
// ============================================
const DISCORD_MESSAGES = `
meln1k — 30/01/2026, 13:07: Hey there! Backend/full-stack engineer looking for 1-2 teammates (designer + product thinker ideal). My idea: ChatGPT interface optimized for learning - think branching conversation nodes so you can ask "wait, what's X?" without derailing your main thread. Trying to solve the context pollution problem when you're learning something new. What I bring: Comfortable with backend/infra/API work and can handle frontend - I've shipped full-stack projects end-to-end before. Not a designer though. Looking for: Designer/frontend dev who gets excited about novel interaction patterns. Bonus if you have edtech/learning background or have felt this pain yourself. Someone who'll challenge the idea and make it better, not just execute. My vibe: Here to meet potential long-term collaborators and build something useful. Winning would be cool but not the main goal. Drop a reply or DM if this resonates - happy to jump on other ideas too if there's good team chemistry!

HagbardCeline — 30/01/2026, 13:36: Moin peeps. I am Jan and fullstack Dev, iam open to collaborate in another Team to push their idea. My own idea is a slim chat ui, to aggregate specfic knowledge about specfic questions, which user can also !tell oder !show (2 word CLI :-P). the use case would be companies and here as internal tool that allows smoother onboarding of new collegues. Bascially employes feed in, it will be RAGged somehwere, and the !show displays the information. iam here on vertical slice level so not auth and rolechecks for now.

Ramon — 30/01/2026, 14:00: Hi everyone i am looking to join a team, now i am Master's in Mechatronics, i only have a general idea about the AI. Role: Mechatronics Engineer. Skills: Basic Knowledge of programming. Idea: my goal is to learn about AI with my teammates while building.

Mohammed — 30/01/2026, 14:30: Hey team. Mohammed here. Product + AI tinkerer, systems thinker, and frequent MVP builder. I like working on ideas where AI actually helps humans instead of creating more dashboards. What I bring to a team: Product thinking & MVP scoping (turning vague ideas into shippable demos), AI-assisted workflows (no-code/low-code pipelines, rapid validation), Systems & UX thinking (how things fit together, not just features), Research, framing, and storytelling for pitches, Project coordination so we actually ship something. I'm looking to join a team, and I'm also open to forming one around a potential project I've been thinking about: a next-gen IDE / dev environment inspired by a Minecraft-like SaaS development model where features are built, composed, and shared as modular "blocks" rather than traditional code-heavy workflows. Profiles I'd love to team up with: AI/ML engineers (LLMs, agents, embeddings, evals), Backend or full-stack devs (APIs, infra, scalability), Frontend / UX builders (especially if you like visual or playful interfaces), Dev tools / IDE nerds or anyone curious about rethinking how software is built, Or generally curious builders who like experimenting and shipping fast.

Saidul_M_Khan — 30/01/2026, 16:14: Hey everyone. Saidul here. AI Engineer with end-to-end experience across the full machine learning pipeline from problem framing and data prep to model development, deployment, and iteration in production. What I bring to a team: Full ML pipeline expertise: data understanding, feature engineering, training, evaluation and deployment. Custom model development: working beyond APIs when needed to build models that create real business value. Applied LLM systems: prompt engineering, fine-tuning, RAG pipelines, embeddings, agents, and evals. Backend & production systems: Python, FastAPI, databases, scalable and maintainable architectures. Impact-driven mindset: focused on solving real problems and turning ML into products users actually rely on. I've worked professionally as a Jr. AI Engineer and I'm currently pursuing an MSc in Data Science at TUHH. I enjoy working closely with product, design, and engineering to move from idea → MVP → production. What I'm looking for: A team that wants to establish a real product in the market, not just experiment. Builders who care about real-world impact and long-term values. Early-stage startups or teams pushing an MVP toward production and users. If this aligns with what you're building, feel free to DM me. I'm happy to contribute, collaborate, and help turn strong ideas into reality. LinkedIn: www.linkedin.com/in/saidul-m-khan

IvanMardini — 30/01/2026, 16:31: Hi! I'm a software engineer with academic background in AI, especially in core fundamentals, and the author of two academic publications. I currently work as a backend engineer, building reliable and maintainable systems. I'm a hands-on AI enthusiast and actively use tools like Cursor and Claude Code to enhance my development workflow. I'm particularly interested in software engineering challenges related to aerospace, but I'm equally open to any idea that's exciting, ambitious, and technically challenging. I'm easy to work with and happy to contribute wherever I can to build a strong team and a solid product. If this resonates with you and you'd like to work together, don't hesitate to reach out via DM. LinkedIn: https://www.linkedin.com/in/imardinig

Katharina F — 30/01/2026, 22:27: Hey Everyone, I'm looking forward to hacking over the weekend with all of you! I am: looking to join a team / open to forming one. Role: AI Agent Specialist & UX/UI Designer with project management background. Looking for: developers (frontend/backend/full-stack) who can handle code & infrastructure. Skills: AI prompting & agent creation (system prompts, data preparation), UX/UI design, Adobe Suite, Canva, Airtable/data management, WordPress/Elementor, Google Suite. Ideas: Smart "second brain" for capturing & organizing saved content (YouTube/Reels/TikTok videos, articles, etc.), Social platform / Social Media like platform, Gamified application (logic/strategy games). Fun fact: I've won several hackathons on UX/UI alone in the past and am excited to expand my skill set by diving deeper into dev. tools over the weekend! I bring a business perspective with a Master's in Marketing and hands-on experience in both fintech and the AI startup landscape. Beyond the technical skills I mentioned, I'm really strong in social media strategy, presentations, and public speaking - which comes in handy for those final pitches! I'm also pretty skilled at creating compelling slide decks and keeping the big-picture overview throughout projects, making sure teams stay aligned and on track during sprints. Happy to take on the PM role, handle the pitch deck, or just keep us organized while we build something awesome together! Looking forward to teaming up! LinkedIn: https://www.linkedin.com/in/katharina-fiegen-226169193/

Niknam — 30/01/2026, 22:30: Hello everybody, nice to be here. I am looking to join a team, who need critical thinking and real business insight. I have been an entrepreneur my whole life and founded 3 successful running small companies (not in tech) and designed and implemented workflows and system my self using python and SQL. I can bring strategic thinking and real use case assessment to the team. I also have experience with python, SQL, Django, and little bit AI engineering. here is my linkedin: www.linkedin.com/in/niknam-tirandazi. I would be very happy to be able to help a team that wants to work on real project, find product market fit.

Arian — 30/01/2026, 22:32: Hi, my name is Arian. I am a CS student at the TU Berlin and have participated in multiple Hackathons. I am working as a working student in SWE. Therefore I have gained experience in professional "normal" coding and vibe coding.

Azadeh — 30/01/2026, 22:35: Hi Everyone, I'm looking to join or form a team. I have these ideas: Zero waste food, Expat helper. I am technical with the AI background. My profile: https://www.linkedin.com/in/azadeh-haratian-nezhadi
`;
// ============================================

interface ParsedMessage {
  username: string;
  content: string;
  timestamp?: string;
}

async function extractProfile(username: string, content: string) {
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: `Extract developer profile from Discord message. Return JSON with:
- full_name (use username if not found)
- headline (professional title based on skills/context)
- bio (brief summary of what they do/want)
- skills (array of technical skills mentioned)
- interests (array of interests/domains like AI, fitness, web3, etc)
- experience_level (junior/intermediate/senior/lead based on context)
- availability_hours (default 15 for hackathon)
- github_url (if mentioned)
- portfolio_url (if mentioned)
Be thorough in extracting skills and interests!`,
        },
        {
          role: "user",
          content: `Username: ${username}\nMessage: ${content}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  const aiData = await aiResponse.json();
  return JSON.parse(aiData.choices[0].message.content);
}

async function createProfile(
  username: string,
  profile: Record<string, unknown>,
) {
  // Create email from username
  const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}_discord@meshit.hackathon`;

  // Check if user exists
  let userId: string;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === email);

  if (existing) {
    userId = existing.id;
    console.log(`   ♻️  User exists, updating...`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name || username,
        discord_username: username,
        imported_from: "discord_hackathon",
        import_date: new Date().toISOString(),
      },
    });

    if (error) throw error;
    userId = newUser.user!.id;
    console.log(`   ✅ Created auth user`);
  }

  // Generate embedding for semantic matching
  let embedding: number[] | null = null;
  if (profile.skills?.length) {
    const embText = [
      profile.headline,
      profile.bio,
      ...(profile.skills || []),
      ...(profile.interests || []),
    ]
      .filter(Boolean)
      .join(" ");

    const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: embText,
      }),
    });

    const embData = await embResponse.json();
    embedding = embData.data[0].embedding;
  }

  // Save profile to Supabase
  const profileData = {
    user_id: userId,
    full_name: profile.full_name || username,
    headline: profile.headline,
    bio: profile.bio,
    skills: profile.skills || [],
    interests: profile.interests || [],
    experience_level: profile.experience_level || "intermediate",
    collaboration_style: "hybrid",
    availability_hours: profile.availability_hours || 15,
    github_url: profile.github_url || null,
    portfolio_url: profile.portfolio_url || null,
    project_preferences: {},
    embedding: embedding ? `[${embedding.join(",")}]` : null,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileData);

  if (profileError) throw profileError;

  return { email, profile: profileData };
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Discord Batch Importer for MeshIt Hackathon           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Parse messages
  const messages = DISCORD_MESSAGES.trim()
    .split("\n\n")
    .filter((msg) => msg.trim().length > 0)
    .map((msg) => {
      const match = msg.match(/^(.+?)\s*—\s*(.+?):\s*(.+)$/s);
      if (match) {
        return {
          username: match[1].trim(),
          timestamp: match[2].trim(),
          content: match[3].trim(),
        };
      }
      return null;
    })
    .filter(Boolean) as ParsedMessage[];

  console.log(`📝 Found ${messages.length} Discord messages to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const msg of messages) {
    try {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 Processing: ${msg.username}`);

      // Extract profile with AI
      const profile = await extractProfile(msg.username, msg.content);
      console.log(`   🧠 AI extracted: ${profile.skills?.length || 0} skills`);

      // Create user and profile in Supabase
      const { email, profile: savedProfile } = await createProfile(
        msg.username,
        profile,
      );

      console.log(`   ✅ Profile saved!`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   💼 ${savedProfile.headline}`);
      console.log(`   🛠️  Skills: ${savedProfile.skills.join(", ")}`);
      console.log(`   🎯 Interests: ${savedProfile.interests.join(", ")}`);

      successCount++;
    } catch (error) {
      console.error(`\n   ❌ Error processing ${msg.username}:`, error);
      errorCount++;
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ Batch Import Complete!\n");
  console.log(`   ✅ Success: ${successCount} profiles`);
  console.log(`   ❌ Errors: ${errorCount} profiles`);
  console.log("\n🚀 Users can now be matched on MeshIt!\n");
}

main().catch(console.error);
