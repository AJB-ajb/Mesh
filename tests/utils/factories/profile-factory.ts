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
  skill_levels: Record<string, number> | null;
  location_preference: number | null;
  availability_slots: Record<string, unknown> | null;
  skills: string[];
  interests: string[];
  portfolio_url: string | null;
  github_url: string | null;
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

function generateSkillLevels(skills: string[]): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const skill of skills) {
    levels[skill] = faker.number.int({ min: 1, max: 5 });
  }
  return levels;
}

function generateAvailabilitySlots(): Record<string, unknown> {
  return {
    monday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "13:00" },
  };
}

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
    skill_levels: generateSkillLevels(skills),
    location_preference: faker.number.int({ min: 0, max: 100 }),
    availability_slots: generateAvailabilitySlots(),
    skills,
    interests,
    portfolio_url: faker.internet.url(),
    github_url: `https://github.com/${faker.internet.userName()}`,
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
  const skills = ["HTML", "CSS", "JavaScript"];
  return createProfile({
    skill_levels: generateSkillLevels(skills),
    skills,
    ...overrides,
  });
};

/**
 * Create an advanced profile
 */
export const createAdvancedProfile = (
  overrides: Partial<TestProfile> = {},
): TestProfile => {
  const skills = [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
  ];
  return createProfile({
    skill_levels: Object.fromEntries(
      skills.map((s) => [s, faker.number.int({ min: 4, max: 5 })]),
    ),
    skills,
    ...overrides,
  });
};
