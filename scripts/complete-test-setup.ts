/**
 * Complete test data setup for MeshIt
 * Creates 5 profiles with complete data, 2 projects, applications, and messages
 */

import { createClient } from "@supabase/supabase-js";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user IDs from previous creation
const testUsers = {
  alice: "f7b7c511-e861-4778-8572-f10f310b206c",
  bob: "d88973c9-960d-41cf-862b-49e1174b4a7e",
  carol: "9f2d1ac5-4805-484f-b75c-d520bf2d7e5c",
  david: "f42ad9b9-23a8-4d8c-b062-2fc09d84a9f1",
  emma: "b7cdcc38-2975-4b81-a818-06a57b1d5539",
};

async function main() {
  console.log("🚀 Complete Test Data Setup\n");

  // STEP 1: Insert/Update Profiles
  console.log("📝 Step 1: Setting up profiles...\n");

  const profiles = [
    {
      id: testUsers.alice,
      user_id: testUsers.alice,
      full_name: "Alice Johnson",
      headline: "Senior Full-Stack Developer | React & Node.js Expert",
      bio: "Senior Full-Stack Developer looking to build the next big thing. 8 years experience in React, Node.js, and cloud infrastructure.",
      location: "San Francisco, CA",
      experience_level: "intermediate",
      collaboration_style: "async",
      availability_hours: 15,
      skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"],
      interests: ["AI/ML", "Cloud Architecture", "Open Source"],
      github_url: "https://github.com/alicejohnson",
      portfolio_url: "https://alicejohnson.dev",
      project_preferences: {
        preferred_stack: ["React", "TypeScript"],
        commitment_level: "15",
        timeline_preference: "3_months",
      },
    },
    {
      id: testUsers.bob,
      user_id: testUsers.bob,
      full_name: "Bob Martinez",
      headline: "Product Designer & AI Entrepreneur",
      bio: "Building AI-powered tools for content creators. Expert in UX/UI and product strategy.",
      location: "Austin, TX",
      experience_level: "intermediate",
      collaboration_style: "async",
      availability_hours: 40,
      skills: ["Figma", "Product Design", "Python", "AI/ML", "User Research"],
      interests: ["AI Tools", "Content Creation", "Startups"],
      github_url: "https://github.com/bobmartinez",
      portfolio_url: "https://bobmartinez.design",
      project_preferences: {
        preferred_stack: ["Python", "AI"],
        commitment_level: "40",
        timeline_preference: "6_months",
      },
    },
    {
      id: testUsers.carol,
      user_id: testUsers.carol,
      full_name: "Carol Davis",
      headline: "Frontend Developer | Accessibility Advocate",
      bio: "Passionate about creating beautiful, accessible web experiences.",
      location: "Seattle, WA",
      experience_level: "beginner",
      collaboration_style: "async",
      availability_hours: 40,
      skills: ["JavaScript", "React", "CSS", "Tailwind", "HTML5"],
      interests: ["Web Accessibility", "UI Animation", "Design Systems"],
      github_url: "https://github.com/caroldavis",
      portfolio_url: "https://caroldavis.com",
      project_preferences: {
        preferred_stack: ["React", "CSS"],
        commitment_level: "40",
        timeline_preference: "1_month",
      },
    },
    {
      id: testUsers.david,
      user_id: testUsers.david,
      full_name: "David Kim",
      headline: "Backend Engineer | Database Performance Expert",
      bio: "Strong focus on scalability and performance. Love working with databases and APIs.",
      location: "New York, NY",
      experience_level: "intermediate",
      collaboration_style: "async",
      availability_hours: 20,
      skills: ["Node.js", "PostgreSQL", "Redis", "Docker", "GraphQL"],
      interests: ["Database Optimization", "API Design", "DevOps"],
      github_url: "https://github.com/davidkim",
      portfolio_url: null,
      project_preferences: {
        preferred_stack: ["Node.js", "PostgreSQL"],
        commitment_level: "20",
        timeline_preference: "3_months",
      },
    },
    {
      id: testUsers.emma,
      user_id: testUsers.emma,
      full_name: "Emma Wilson",
      headline: "Full-Stack Developer & Designer",
      bio: "I bring ideas to life with clean code and beautiful interfaces.",
      location: "Portland, OR",
      experience_level: "intermediate",
      collaboration_style: "async",
      availability_hours: 10,
      skills: ["Vue.js", "Python", "Django", "Tailwind", "UI Design"],
      interests: ["Startup MVPs", "Design Systems", "PWAs"],
      github_url: "https://github.com/emmawilson",
      portfolio_url: "https://emmawilson.io",
      project_preferences: {
        preferred_stack: ["Vue.js", "Python"],
        commitment_level: "10",
        timeline_preference: "1_month",
      },
    },
  ];

  for (const profile of profiles) {
    const { error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" });

    if (error) {
      console.log(`  ⚠️  ${profile.full_name}: ${error.message}`);
    } else {
      console.log(`  ✅ ${profile.full_name}`);
    }
  }

  // STEP 2: Create Projects
  console.log("\n📦 Step 2: Creating projects...\n");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const projects = [
    {
      creator_id: testUsers.alice,
      title: "AI-Powered Task Manager",
      description:
        "Building an intelligent task management app that uses ML to predict completion times. Need frontend developer.",
      required_skills: ["React", "TypeScript", "Tailwind CSS"],
      team_size: 2,
      experience_level: "any",
      commitment_hours: 15,
      timeline: "1_month",
      status: "open",
      expires_at: expiresAt.toISOString(),
    },
    {
      creator_id: testUsers.bob,
      title: "Content Creator Analytics Dashboard",
      description:
        "Real-time analytics for YouTube/TikTok creators. Need backend developer for data pipelines.",
      required_skills: ["Node.js", "PostgreSQL", "Redis"],
      team_size: 3,
      experience_level: "any",
      commitment_hours: 40,
      timeline: "6_months",
      status: "open",
      expires_at: expiresAt.toISOString(),
    },
  ];

  const projectIds: string[] = [];

  for (const project of projects) {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select("id")
      .single();

    if (error) {
      console.log(`  ⚠️  ${project.title}: ${error.message}`);
    } else {
      console.log(`  ✅ ${project.title} (ID: ${data.id})`);
      projectIds.push(data.id);
    }
  }

  // STEP 3: Create Applications
  console.log("\n📨 Step 3: Creating applications...\n");

  if (projectIds.length >= 2) {
    const applications = [
      {
        profile_id: testUsers.carol,
        project_id: projectIds[0],
        status: "accepted",
        message: "I would love to work on the frontend for this project!",
      },
      {
        profile_id: testUsers.david,
        project_id: projectIds[1],
        status: "rejected",
        message: "Interested in backend work. Let me know if I can help.",
      },
      {
        profile_id: testUsers.emma,
        project_id: projectIds[0],
        status: "pending",
        message:
          "This sounds exciting! I have Vue experience but can work with React.",
      },
      {
        profile_id: testUsers.emma,
        project_id: projectIds[1],
        status: "pending",
        message: "I have Python/Django backend experience.",
      },
    ];

    for (const app of applications) {
      const { error } = await supabase.from("applications").insert(app);
      if (error) {
        console.log(`  ⚠️  Application error: ${error.message}`);
      } else {
        const profile = profiles.find((p) => p.id === app.profile_id);
        console.log(`  ✅ ${profile?.full_name} → Project ${app.status}`);
      }
    }
  }

  // STEP 4: Create Messages
  console.log("\n💬 Step 4: Creating messages...\n");

  const messages = [
    {
      sender_id: testUsers.alice,
      recipient_id: testUsers.carol,
      content:
        "Hi Carol! Saw your application. Your portfolio looks great! When can you start?",
      read: true,
    },
    {
      sender_id: testUsers.carol,
      recipient_id: testUsers.alice,
      content:
        "Hi Alice! Thanks! I can start next week. Excited to work on this!",
      read: true,
    },
    {
      sender_id: testUsers.bob,
      recipient_id: testUsers.david,
      content:
        "Hi David, thanks for applying. Unfortunately we need someone with more Redis experience.",
      read: true,
    },
    {
      sender_id: testUsers.david,
      recipient_id: testUsers.bob,
      content: "No problem! I understand. Good luck with the project!",
      read: false,
    },
    {
      sender_id: testUsers.emma,
      recipient_id: testUsers.alice,
      content:
        "Hi! I applied to your task manager project. Happy to discuss my React experience.",
      read: false,
    },
    {
      sender_id: testUsers.carol,
      recipient_id: testUsers.david,
      content:
        "Hey David! Saw your profile. Want to collaborate on a side project?",
      read: false,
    },
  ];

  for (const msg of messages) {
    const { error } = await supabase.from("messages").insert(msg);
    if (error) {
      console.log(`  ⚠️  Message error: ${error.message}`);
    } else {
      const sender = profiles.find((p) => p.id === msg.sender_id);
      const recipient = profiles.find((p) => p.id === msg.recipient_id);
      console.log(`  ✅ ${sender?.full_name} → ${recipient?.full_name}`);
    }
  }

  // STEP 5: Verification
  console.log("\n🔍 Step 5: Verifying data...\n");

  const { count: profileCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });
  const { count: appCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true });
  const { count: msgCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true });

  console.log(`  📊 Profiles: ${profileCount}`);
  console.log(`  📦 Projects: ${projectCount}`);
  console.log(`  📨 Applications: ${appCount}`);
  console.log(`  💬 Messages: ${msgCount}`);

  console.log("\n✅ Test data setup complete!\n");
  console.log("🔑 Test Credentials:");
  console.log("  alice.creator@meshit.test / TestPass123!");
  console.log("  bob.creator@meshit.test / TestPass123!");
  console.log("  carol.seeker@meshit.test / TestPass123!");
  console.log("  david.seeker@meshit.test / TestPass123!");
  console.log("  emma.seeker@meshit.test / TestPass123!\n");
}

main().catch(console.error);
