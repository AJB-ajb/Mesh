/**
 * Seed 5 test profiles into Supabase database
 *
 * Profile 1 & 2: Project creators with active postings
 * Profile 3, 4, 5: Job seekers who completed onboarding
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jirgkhjdxahfsgqxprhh.supabase.co";
const supabaseServiceKey =
  "***REMOVED***";

// Use service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestProfile {
  email: string;
  password: string;
  displayName: string;
  role: "creator" | "seeker";
  bio: string;
  skills: string[];
  experience: string;
  availability: string;
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
    experience: "8 years",
    availability: "Part-time (10-15 hrs/week)",
    github: "github.com/alicejohnson",
  },
  {
    email: "bob.creator@meshit.test",
    password: "TestPass123!",
    displayName: "Bob Martinez",
    role: "creator",
    bio: "Product designer turned entrepreneur. Building AI-powered tools for content creators. Expert in UX/UI and product strategy.",
    skills: ["Figma", "Product Design", "Python", "AI/ML", "User Research"],
    experience: "6 years",
    availability: "Full-time",
    github: "github.com/bobmartinez",
  },
  {
    email: "carol.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "Carol Davis",
    role: "seeker",
    bio: "Frontend developer passionate about creating beautiful, accessible web experiences. Recently completed boot camp.",
    skills: ["JavaScript", "React", "CSS", "Tailwind", "Figma"],
    experience: "2 years",
    availability: "Full-time",
    github: "github.com/caroldavis",
  },
  {
    email: "david.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "David Kim",
    role: "seeker",
    bio: "Backend engineer with strong focus on scalability and performance. Love working with databases and APIs.",
    skills: ["Node.js", "PostgreSQL", "Redis", "Docker", "GraphQL"],
    experience: "4 years",
    availability: "Part-time (15-20 hrs/week)",
    github: "github.com/davidkim",
  },
  {
    email: "emma.seeker@meshit.test",
    password: "TestPass123!",
    displayName: "Emma Wilson",
    role: "seeker",
    bio: "Full-stack developer and designer. I bring ideas to life with clean code and beautiful interfaces.",
    skills: ["Vue.js", "Python", "Django", "Tailwind", "UI Design"],
    experience: "3 years",
    availability: "Part-time (10 hrs/week)",
    github: "github.com/emmawilson",
  },
];

interface Project {
  title: string;
  description: string;
  requiredSkills: string[];
  commitment: string;
  status: "open" | "in-progress" | "closed";
}

const testProjects: { creatorEmail: string; project: Project }[] = [
  {
    creatorEmail: "alice.creator@meshit.test",
    project: {
      title: "AI-Powered Task Manager",
      description:
        "Building an intelligent task management app that uses ML to predict completion times and suggest priorities. Looking for frontend developer with React experience.",
      requiredSkills: ["React", "TypeScript", "Tailwind CSS"],
      commitment: "10-15 hrs/week for 3 months",
      status: "open",
    },
  },
  {
    creatorEmail: "bob.creator@meshit.test",
    project: {
      title: "Content Creator Analytics Dashboard",
      description:
        "Real-time analytics platform for YouTube and TikTok creators. Need backend developer experienced with data pipelines and APIs.",
      requiredSkills: ["Node.js", "PostgreSQL", "Redis", "REST APIs"],
      commitment: "Full-time for 6 months",
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

  const { data: existingProjects } = await supabase
    .from("projects")
    .select("*");
  console.log(`   Found ${existingProjects?.length || 0} existing projects\n`);

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

  const { data: sampleProject } = await supabase
    .from("projects")
    .select("*")
    .limit(1)
    .single();

  if (sampleProject) {
    console.log(
      "   Project table columns:",
      Object.keys(sampleProject).join(", "),
    );
  } else {
    console.log(
      "   No existing projects - will discover structure during insert",
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
          experience: profile.experience,
          availability: profile.availability,
          github_url: profile.github,
          onboarding_completed: true,
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
    `\n📊 Step 4: Creating ${testProjects.length} test projects...\n`,
  );

  for (const { creatorEmail, project } of testProjects) {
    const creator = createdUsers.find((u) => u.email === creatorEmail);
    if (!creator) {
      console.log(`   ⚠️  Creator not found: ${creatorEmail}`);
      continue;
    }

    console.log(`   Creating project: ${project.title}...`);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert({
        creator_id: creator.userId,
        title: project.title,
        description: project.description,
        required_skills: project.requiredSkills,
        commitment: project.commitment,
        status: project.status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projectError) {
      console.log(`   ⚠️  Project error: ${projectError.message}`);
      console.log(`   Details:`, projectError);
    } else {
      console.log(
        `   ✅ Project created: ${project.title} (ID: ${projectData.id})`,
      );
    }
  }

  console.log("\n✅ Database seeding complete!\n");
  console.log("📝 Summary:");
  console.log(`   - ${createdUsers.length} users created`);
  console.log(`   - ${testProjects.length} projects created`);
  console.log("\n🔑 Test Credentials:");
  testProfiles.forEach((p) => {
    console.log(`   ${p.displayName}: ${p.email} / ${p.password}`);
  });
}

main().catch(console.error);
