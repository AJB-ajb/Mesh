/**
 * Profile Factory
 * Creates test profile data for MeshIt profiles table
 */

import { faker } from "@faker-js/faker";

export type TestProfile = {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  collaboration_style: "sync" | "async" | "flexible" | null;
  availability_hours: number | null;
  skills: string[];
  interests: string[];
  portfolio_url: string | null;
  github_url: string | null;
  project_preferences: Record<string, unknown>;
};

const skillPool = [
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Next.js",
  "Vue.js",
];

const interestPool = [
  "Web Development",
  "Mobile Apps",
  "AI/ML",
  "DevOps",
  "Game Development",
  "Open Source",
  "Startups",
  "Education",
  "Healthcare Tech",
  "FinTech",
];

export const createProfile = (
  overrides: Partial<TestProfile> = {},
): TestProfile => {
  const skills = faker.helpers.arrayElements(
    skillPool,
    faker.number.int({ min: 3, max: 7 }),
  );
  const interests = faker.helpers.arrayElements(
    interestPool,
    faker.number.int({ min: 2, max: 5 }),
  );

  return {
    user_id: faker.string.uuid(),
    full_name: faker.person.fullName(),
    headline: faker.person.jobTitle(),
    bio: faker.lorem.paragraph(),
    location: faker.location.city() + ", " + faker.location.country(),
    experience_level: faker.helpers.arrayElement([
      "beginner",
      "intermediate",
      "advanced",
    ]),
    collaboration_style: faker.helpers.arrayElement([
      "sync",
      "async",
      "flexible",
    ]),
    availability_hours: faker.number.int({ min: 5, max: 40 }),
    skills,
    interests,
    portfolio_url: faker.internet.url(),
    github_url: `https://github.com/${faker.internet.userName()}`,
    project_preferences: {
      remote_only: faker.datatype.boolean(),
      min_team_size: faker.number.int({ min: 1, max: 3 }),
      max_team_size: faker.number.int({ min: 4, max: 10 }),
    },
    ...overrides,
  };
};

export const createProfiles = (
  count: number,
  overrides: Partial<TestProfile> = {},
): TestProfile[] => {
  return Array.from({ length: count }, () => createProfile(overrides));
};

/**
 * Create a beginner profile
 */
export const createBeginnerProfile = (
  overrides: Partial<TestProfile> = {},
): TestProfile => {
  return createProfile({
    experience_level: "beginner",
    skills: ["HTML", "CSS", "JavaScript"],
    availability_hours: faker.number.int({ min: 10, max: 20 }),
    ...overrides,
  });
};

/**
 * Create an advanced profile
 */
export const createAdvancedProfile = (
  overrides: Partial<TestProfile> = {},
): TestProfile => {
  return createProfile({
    experience_level: "advanced",
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"],
    availability_hours: faker.number.int({ min: 20, max: 40 }),
    ...overrides,
  });
};
