/**
 * Seed 5 test profiles into Supabase database
 *
 * Profile 1 & 2: Posting creators with active postings
 * Profile 3, 4, 5: Job seekers who completed onboarding
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config(); // Load .env

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env",
  );
  process.exit(1);
}

// Use secret key for admin operations
const supabase = createClient(supabaseUrl, supabaseSecretKey);

interface TestProfile {
  email: string;
  password: string;
  displayName: string;
  role: "creator" | "seeker";
  bio: string;
  skills: string[];
  github?: string;
}

const testProfiles: TestProfile[] = [
  {
    email: "alice.creator@meshit.test",
    password: "TestPass123!",
    displayName: "Alice Johnson",
    role: "creator",
    bio: "Senior Full-Stack Developer looking to build the next big thing. 8 years experience in React, Node.js, and cloud infrastructure.",
    skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"],
    github: "github.com/alicejohnson",
  },
  {
    email: "bob.creator@meshit.test",
    password: "TestPass123!",
    displayName: "Bob Martinez",
    role: "creator",
    bio: "Product designer turned entrepreneur. Building AI-powered tools for content creators. Expert in UX/UI and product strategy.",
    skills: ["Figma", "Product Design", "Python", "AI/ML", "User Research"],
    github: "github.com/bobmartinez",
  },
  {
    email: "carol.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "Carol Davis",
    role: "seeker",
    bio: "Frontend developer passionate about creating beautiful, accessible web experiences. Recently completed boot camp.",
    skills: ["JavaScript", "React", "CSS", "Tailwind", "Figma"],
    github: "github.com/caroldavis",
  },
  {
    email: "david.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "David Kim",
    role: "seeker",
    bio: "Backend engineer with strong focus on scalability and performance. Love working with databases and APIs.",
    skills: ["Node.js", "PostgreSQL", "Redis", "Docker", "GraphQL"],
    github: "github.com/davidkim",
  },
  {
    email: "emma.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "Emma Wilson",
    role: "seeker",
    bio: "Full-stack developer and designer. I bring ideas to life with clean code and beautiful interfaces.",
    skills: ["Vue.js", "Python", "Django", "Tailwind", "UI Design"],
    github: "github.com/emmawilson",
  },
];

interface Posting {
  title: string;
  description: string;
  skills: string[];
  category: string;
  estimated_time: string;
  team_size_min: number;
  team_size_max: number;
  mode: "remote" | "hybrid" | "onsite";
  status: "open" | "in-progress" | "closed";
}

const testPostings: { creatorEmail: string; posting: Posting }[] = [
  {
    creatorEmail: "alice.creator@meshit.test",
    posting: {
      title: "AI-Powered Task Manager",
      description:
        "Building an intelligent task management app that uses ML to predict completion times and suggest priorities. Looking for frontend developer with React experience.",
      skills: ["React", "TypeScript", "Tailwind CSS"],
      category: "side-project",
      estimated_time: "3 months",
      team_size_min: 2,
      team_size_max: 4,
      mode: "remote",
      status: "open",
    },
  },
  {
    creatorEmail: "bob.creator@meshit.test",
    posting: {
      title: "Content Creator Analytics Dashboard",
      description:
        "Real-time analytics platform for YouTube and TikTok creators. Need backend developer experienced with data pipelines and APIs.",
      skills: ["Node.js", "PostgreSQL", "Redis", "REST APIs"],
      category: "startup",
      estimated_time: "6 months",
      team_size_min: 3,
      team_size_max: 6,
      mode: "hybrid",
      status: "open",
    },
  },
];

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Step 1: Inspect existing tables first
  console.log("📊 Step 1: Checking existing data...\n");

  const { data: existingProfiles, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" });

  console.log(`   Found ${count} existing profiles`);
  if (existingProfiles && existingProfiles.length > 0) {
    console.log(
      "   Existing profiles:",
      existingProfiles
        .map((p: Record<string, unknown>) => p.email || p.id)
        .join(", "),
    );
  }

  const { data: existingPostings } = await supabase
    .from("postings")
    .select("*");
  console.log(`   Found ${existingPostings?.length || 0} existing postings\n`);

  // Step 2: Check table structure
  console.log("📋 Step 2: Inspecting table structure...\n");

  const { data: sampleProfile } = await supabase
    .from("profiles")
    .select("*")
    .limit(1)
    .single();

  if (sampleProfile) {
    console.log(
      "   Profile table columns:",
      Object.keys(sampleProfile).join(", "),
    );
  } else {
    console.log(
      "   No existing profiles - will discover structure during insert",
    );
  }

  const { data: samplePosting } = await supabase
    .from("postings")
    .select("*")
    .limit(1)
    .single();

  if (samplePosting) {
    console.log(
      "   Posting table columns:",
      Object.keys(samplePosting).join(", "),
    );
  } else {
    console.log(
      "   No existing postings - will discover structure during insert",
    );
  }

  console.log("\n🚀 Step 3: Creating test users and profiles...\n");

  const createdUsers: (TestProfile & { userId: string })[] = [];

  for (const profile of testProfiles) {
    console.log(`   Creating user: ${profile.email}...`);

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: profile.email,
        password: profile.password,
        email_confirm: true,
        user_metadata: {
          display_name: profile.displayName,
        },
      });

    if (authError) {
      console.log(
        `   ⚠️  Auth error for ${profile.email}: ${authError.message}`,
      );

      // Try to sign in if user already exists
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: profile.password,
      });

      if (signInData.user) {
        console.log(
          `   ✅ User already exists, using existing ID: ${signInData.user.id}`,
        );
        createdUsers.push({ ...profile, userId: signInData.user.id });
      }
      continue;
    }

    if (authData.user) {
      console.log(`   ✅ User created with ID: ${authData.user.id}`);
      createdUsers.push({ ...profile, userId: authData.user.id });

      // Create profile entry
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: profile.email,
          display_name: profile.displayName,
          bio: profile.bio,
          skills: profile.skills,
          github_url: profile.github,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        console.log(`   ⚠️  Profile error: ${profileError.message}`);
        console.log(`   Details:`, profileError);
      } else {
        console.log(`   ✅ Profile created for ${profile.displayName}`);
      }
    }
  }

  console.log(
    `\n📊 Step 4: Creating ${testPostings.length} test postings...\n`,
  );

  for (const { creatorEmail, posting } of testPostings) {
    const creator = createdUsers.find((u) => u.email === creatorEmail);
    if (!creator) {
      console.log(`   ⚠️  Creator not found: ${creatorEmail}`);
      continue;
    }

    console.log(`   Creating posting: ${posting.title}...`);

    const { data: postingData, error: postingError } = await supabase
      .from("postings")
      .insert({
        creator_id: creator.userId,
        title: posting.title,
        description: posting.description,
        skills: posting.skills,
        category: posting.category,
        estimated_time: posting.estimated_time,
        team_size_min: posting.team_size_min,
        team_size_max: posting.team_size_max,
        mode: posting.mode,
        status: posting.status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postingError) {
      console.log(`   ⚠️  Posting error: ${postingError.message}`);
      console.log(`   Details:`, postingError);
    } else {
      console.log(
        `   ✅ Posting created: ${posting.title} (ID: ${postingData.id})`,
      );
    }
  }

  console.log("\n✅ Database seeding complete!\n");
  console.log("📝 Summary:");
  console.log(`   - ${createdUsers.length} users created`);
  console.log(`   - ${testPostings.length} postings created`);
  console.log("\n🔑 Test Credentials:");
  testProfiles.forEach((p) => {
    console.log(`   ${p.displayName}: ${p.email} / ${p.password}`);
  });
}

main().catch(console.error);
