/**
 * Posting Factory
 * Creates test posting data for Mesh postings table
 */

import { faker } from "@faker-js/faker";

export type TestPosting = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  team_size_min: number;
  team_size_max: number;
  category: string;
  tags: string[];
  mode: "remote" | "hybrid" | "onsite";
  location_preference: string | null;
  estimated_time: string;
  skill_level_min: number;
  context_identifier: string | null;
  natural_language_criteria: string | null;
  auto_accept: boolean;
  status: "open" | "closed" | "filled" | "expired";
  expiration_date: Date;
};

const postingTitles = [
  "Build E-Commerce Platform",
  "Create Social Media Dashboard",
  "Develop AI Chatbot",
  "Mobile Fitness Tracker",
  "Real-time Collaboration Tool",
  "Portfolio Website Generator",
  "Task Management System",
  "Recipe Sharing Platform",
];

const categoryPool = [
  "side-project",
  "startup",
  "open-source",
  "freelance",
  "hackathon",
];

const tagPool = [
  "web",
  "mobile",
  "ai",
  "devops",
  "design",
  "backend",
  "frontend",
  "fullstack",
];

export const createPosting = (
  overrides: Partial<TestPosting> = {},
): TestPosting => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

  const teamSizeMin = faker.number.int({ min: 2, max: 4 });

  return {
    id: faker.string.uuid(),
    creator_id: faker.string.uuid(),
    title: faker.helpers.arrayElement(postingTitles),
    description: faker.lorem.paragraphs(2),
    team_size_min: teamSizeMin,
    team_size_max: teamSizeMin + faker.number.int({ min: 1, max: 4 }),
    category: faker.helpers.arrayElement(categoryPool),
    tags: faker.helpers.arrayElements(
      tagPool,
      faker.number.int({ min: 1, max: 4 }),
    ),
    mode: faker.helpers.arrayElement(["remote", "hybrid", "onsite"]),
    location_preference:
      faker.helpers.maybe(() => faker.location.city(), { probability: 0.4 }) ??
      null,
    estimated_time: `${faker.number.int({ min: 1, max: 12 })} months`,
    skill_level_min: faker.number.int({ min: 1, max: 5 }),
    context_identifier: null,
    natural_language_criteria: null,
    auto_accept: false,
    status: "open",
    expiration_date: expirationDate,
    ...overrides,
  };
};

export const createPostings = (
  count: number,
  overrides: Partial<TestPosting> = {},
): TestPosting[] => {
  return Array.from({ length: count }, () => createPosting(overrides));
};

/**
 * Create an expired posting
 */
export const createExpiredPosting = (
  overrides: Partial<TestPosting> = {},
): TestPosting => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

  return createPosting({
    status: "expired",
    expiration_date: pastDate,
    ...overrides,
  });
};

/**
 * Create a filled posting
 */
export const createFilledPosting = (
  overrides: Partial<TestPosting> = {},
): TestPosting => {
  return createPosting({
    status: "filled",
    ...overrides,
  });
};
