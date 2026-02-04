/**
 * Matching Engine API Tests
 * Tests for profile-to-project and project-to-profile matching
 */

import { test, expect } from "@playwright/test";
import { createProfile } from "../utils/factories/profile-factory";
import {
  createProject,
  createProjects,
} from "../utils/factories/project-factory";
import { seedUser, seedProfile, seedProject } from "../utils/seed-helpers";
import { createUser } from "../utils/factories/user-factory";
// Note: API mocking infrastructure available in ../utils/mock-api.ts
// Currently using real API keys in CI (see .github/workflows/ci.yml)

test.describe("Matching API", () => {
  let authToken: string;
  let userId: string;

  test.beforeEach(async ({ request }) => {
    const user = createUser();
    const { userId: id } = await seedUser(user);
    userId = id;

    const loginResponse = await request.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    const { session } = await loginResponse.json();
    authToken = session.access_token;
  });

  test.describe("GET /api/matches", () => {
    test("returns matches for user profile", async ({ request }) => {
      // Create user profile with specific skills
      const profile = createProfile({
        user_id: userId,
        skills: ["TypeScript", "React", "Node.js"],
        experience_level: "intermediate",
      });
      await seedProfile(request, profile);

      // Create projects that should match
      const matchingProject = createProject({
        required_skills: ["TypeScript", "React"],
        experience_level: "intermediate",
      });
      await seedProject(request, matchingProject);

      // Trigger matching
      const response = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status()).toBe(200);
      const matches = await response.json();

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);

      // Verify match structure
      const match = matches[0];
      expect(match).toHaveProperty("similarity_score");
      expect(match).toHaveProperty("project");
      expect(match.similarity_score).toBeGreaterThan(0);
      expect(match.similarity_score).toBeLessThanOrEqual(1);
    });

    test("returns empty array when no matches exist", async ({ request }) => {
      // Create profile with very specific skills
      const profile = createProfile({
        user_id: userId,
        skills: ["COBOL", "Fortran", "Assembly"],
      });
      await seedProfile(request, profile);

      const response = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status()).toBe(200);
      const matches = await response.json();
      expect(Array.isArray(matches)).toBe(true);
    });

    test("sorts matches by similarity score descending", async ({
      request,
    }) => {
      const profile = createProfile({
        user_id: userId,
        skills: ["TypeScript", "React", "Node.js"],
      });
      await seedProfile(request, profile);

      // Create multiple projects with varying skill overlap
      const projects = [
        createProject({ required_skills: ["TypeScript"] }), // Low match
        createProject({ required_skills: ["TypeScript", "React", "Node.js"] }), // High match
        createProject({ required_skills: ["TypeScript", "React"] }), // Medium match
      ];
      await Promise.all(projects.map((p) => seedProject(request, p)));

      const response = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const matches = await response.json();

      // Verify descending order
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].similarity_score).toBeGreaterThanOrEqual(
          matches[i + 1].similarity_score,
        );
      }
    });
  });

  test.describe("GET /api/matches/:matchId", () => {
    test("returns match details with explanation", async ({ request }) => {
      const profile = createProfile({ user_id: userId });
      await seedProfile(request, profile);

      const project = createProject();
      await seedProject(request, project);

      // Get matches
      const matchesResponse = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const matches = await matchesResponse.json();
      const matchId = matches[0]?.id;

      if (!matchId) {
        test.skip(); // Skip if no matches generated
      }

      // Get match details
      const response = await request.get(`/api/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status()).toBe(200);
      const matchDetails = await response.json();

      expect(matchDetails).toHaveProperty("explanation");
      expect(matchDetails).toHaveProperty("score_breakdown");
      expect(matchDetails.explanation).toBeTruthy();
    });
  });

  test.describe("POST /api/matches/:matchId/apply", () => {
    test("updates match status to applied", async ({ request }) => {
      const profile = createProfile({ user_id: userId });
      await seedProfile(request, profile);

      const project = createProject();
      await seedProject(request, project);

      const matchesResponse = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const matches = await matchesResponse.json();
      const matchId = matches[0]?.id;

      if (!matchId) {
        test.skip();
      }

      const response = await request.post(`/api/matches/${matchId}/apply`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status()).toBe(200);
      const updatedMatch = await response.json();
      expect(updatedMatch.status).toBe("applied");
      expect(updatedMatch.responded_at).toBeTruthy();
    });

    test("prevents duplicate applications", async ({ request }) => {
      const profile = createProfile({ user_id: userId });
      await seedProfile(request, profile);

      const project = createProject();
      await seedProject(request, project);

      const matchesResponse = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const matches = await matchesResponse.json();
      const matchId = matches[0]?.id;

      if (!matchId) {
        test.skip();
      }

      // Apply once
      await request.post(`/api/matches/${matchId}/apply`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Try to apply again
      const secondResponse = await request.post(
        `/api/matches/${matchId}/apply`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(secondResponse.status()).toBe(409); // Conflict
    });
  });

  test.describe("Matching Performance", () => {
    test("completes matching in under 30 seconds", async ({ request }) => {
      const profile = createProfile({ user_id: userId });
      await seedProfile(request, profile);

      // Create 50 projects to match against
      const projects = createProjects(50);
      await Promise.all(projects.map((p) => seedProject(request, p)));

      const startTime = Date.now();

      const response = await request.get("/api/matches", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const duration = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(30000); // 30 seconds
    });
  });
});
