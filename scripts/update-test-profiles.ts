/**
 * Update test profiles with correct schema fields
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jirgkhjdxahfsgqxprhh.supabase.co";
const supabaseServiceKey =
  "***REMOVED***";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const profiles = [
  {
    userId: "f7b7c511-e861-4778-8572-f10f310b206c",
    email: "alice.creator@meshit.test",
    full_name: "Alice Johnson",
    headline: "Senior Full-Stack Developer | React & Node.js Expert",
    bio: "Senior Full-Stack Developer looking to build the next big thing. 8 years experience in React, Node.js, and cloud infrastructure. Passionate about creating scalable, user-centric applications.",
    location: "San Francisco, CA",
    experience_level: "senior",
    collaboration_style: "lead",
    availability_hours: 15,
    skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL", "Docker"],
    interests: ["AI/ML", "Cloud Architecture", "Open Source"],
    github_url: "https://github.com/alicejohnson",
    portfolio_url: "https://alicejohnson.dev",
    project_preferences: {
      teamSize: "small",
      duration: "3-6 months",
      industries: ["SaaS", "FinTech", "EdTech"],
    },
  },
  {
    userId: "d88973c9-960d-41cf-862b-49e1174b4a7e",
    email: "bob.creator@meshit.test",
    full_name: "Bob Martinez",
    headline: "Product Designer & AI Entrepreneur",
    bio: "Product designer turned entrepreneur. Building AI-powered tools for content creators. Expert in UX/UI and product strategy with 6 years of experience.",
    location: "Austin, TX",
    experience_level: "senior",
    collaboration_style: "collaborative",
    availability_hours: 40,
    skills: [
      "Figma",
      "Product Design",
      "Python",
      "AI/ML",
      "User Research",
      "Prototyping",
    ],
    interests: ["AI Tools", "Content Creation", "Startups"],
    github_url: "https://github.com/bobmartinez",
    portfolio_url: "https://bobmartinez.design",
    project_preferences: {
      teamSize: "medium",
      duration: "6+ months",
      industries: ["AI", "Creator Economy", "Media"],
    },
  },
  {
    userId: "9f2d1ac5-4805-484f-b75c-d520bf2d7e5c",
    email: "carol.seeker@meshit.test",
    full_name: "Carol Davis",
    headline: "Frontend Developer | Accessibility Advocate",
    bio: "Frontend developer passionate about creating beautiful, accessible web experiences. Recently completed boot camp and eager to join innovative projects.",
    location: "Seattle, WA",
    experience_level: "junior",
    collaboration_style: "learner",
    availability_hours: 40,
    skills: ["JavaScript", "React", "CSS", "Tailwind", "Figma", "HTML5"],
    interests: ["Web Accessibility", "UI Animation", "Design Systems"],
    github_url: "https://github.com/caroldavis",
    portfolio_url: "https://caroldavis.com",
    project_preferences: {
      teamSize: "any",
      duration: "1-3 months",
      industries: ["EdTech", "Healthcare", "Non-Profit"],
    },
  },
  {
    userId: "f42ad9b9-23a8-4d8c-b062-2fc09d84a9f1",
    email: "david.seeker@meshit.test",
    full_name: "David Kim",
    headline: "Backend Engineer | Database Performance Expert",
    bio: "Backend engineer with strong focus on scalability and performance. Love working with databases and APIs. 4 years of experience optimizing high-traffic systems.",
    location: "New York, NY",
    experience_level: "mid",
    collaboration_style: "independent",
    availability_hours: 20,
    skills: [
      "Node.js",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GraphQL",
      "Microservices",
    ],
    interests: ["Database Optimization", "API Design", "DevOps"],
    github_url: "https://github.com/davidkim",
    portfolio_url: null,
    project_preferences: {
      teamSize: "small",
      duration: "3-6 months",
      industries: ["FinTech", "SaaS", "Gaming"],
    },
  },
  {
    userId: "b7cdcc38-2975-4b81-a818-06a57b1d5539",
    email: "emma.seeker@meshit.test",
    full_name: "Emma Wilson",
    headline: "Full-Stack Developer & Designer",
    bio: "Full-stack developer and designer. I bring ideas to life with clean code and beautiful interfaces. 3 years of experience building MVPs for startups.",
    location: "Portland, OR",
    experience_level: "mid",
    collaboration_style: "collaborative",
    availability_hours: 10,
    skills: [
      "Vue.js",
      "Python",
      "Django",
      "Tailwind",
      "UI Design",
      "REST APIs",
    ],
    interests: ["Startup MVPs", "Design Systems", "Progressive Web Apps"],
    github_url: "https://github.com/emmawilson",
    portfolio_url: "https://emmawilson.io",
    project_preferences: {
      teamSize: "small",
      duration: "1-3 months",
      industries: ["Startup", "Social Impact", "Sustainability"],
    },
  },
];

const projects = [
  {
    creatorId: "f7b7c511-e861-4778-8572-f10f310b206c",
    title: "AI-Powered Task Manager",
    description:
      "Building an intelligent task management app that uses ML to predict completion times and suggest priorities. We have the backend API ready and need a talented frontend developer with React experience to create an intuitive, beautiful UI.",
    required_skills: ["React", "TypeScript", "Tailwind CSS", "REST APIs"],
    team_size: 2,
    experience_level: "any",
    commitment_hours: 15,
    timeline: "1_month",
    status: "open",
  },
  {
    creatorId: "d88973c9-960d-41cf-862b-49e1174b4a7e",
    title: "Content Creator Analytics Dashboard",
    description:
      "Real-time analytics platform for YouTube and TikTok creators. We need a backend developer experienced with data pipelines and APIs to build scalable infrastructure for processing millions of data points.",
    required_skills: [
      "Node.js",
      "PostgreSQL",
      "Redis",
      "REST APIs",
      "Data Processing",
    ],
    team_size: 3,
    experience_level: "any",
    commitment_hours: 40,
    timeline: "6_months",
    status: "open",
  },
];

async function main() {
  console.log("📝 Updating test profiles with correct schema...\n");

  for (const profile of profiles) {
    console.log(`   Updating profile: ${profile.full_name}...`);

    const { error } = await supabase
      .from("profiles")
      .update({
        user_id: profile.userId,
        full_name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        experience_level: profile.experience_level,
        collaboration_style: profile.collaboration_style,
        availability_hours: profile.availability_hours,
        skills: profile.skills,
        interests: profile.interests,
        github_url: profile.github_url,
        portfolio_url: profile.portfolio_url,
        project_preferences: profile.project_preferences,
      })
      .eq("id", profile.userId)
      .select();

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      console.log(`   ✅ Updated ${profile.full_name}`);
    }
  }

  console.log("\n📦 Creating projects with correct schema...\n");

  for (const project of projects) {
    console.log(`   Creating project: ${project.title}...`);

    // Calculate expires_at (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        creator_id: project.creatorId,
        title: project.title,
        description: project.description,
        required_skills: project.required_skills,
        team_size: project.team_size,
        experience_level: project.experience_level,
        commitment_hours: project.commitment_hours,
        timeline: project.timeline,
        status: project.status,
        expires_at: expiresAt.toISOString(),
      })
      .select();

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      console.log(`   ✅ Created project (ID: ${data[0]?.id})`);
    }
  }

  console.log("\n✅ Update complete!\n");
}

main().catch(console.error);
