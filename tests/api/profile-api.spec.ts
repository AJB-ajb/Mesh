/**
 * Profile API Tests
 * Tests for profile CRUD operations and AI extraction
 */

import { test, expect } from "@playwright/test";
import { seedUser } from "../utils/seed-helpers";
import { createUser } from "../utils/factories/user-factory";
// Note: API mocking infrastructure available in ../utils/mock-api.ts
// Currently using real API keys in CI (see .github/workflows/ci.yml)

test.describe("Profile API", () => {
  let authToken: string;
  let userId: string;

  test.beforeEach(async ({ request }) => {
    // Create and authenticate test user
    const user = createUser();
    const { userId: id } = await seedUser(user);
    userId = id;

    // Get auth token
    const loginResponse = await request.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    const { session } = await loginResponse.json();
    authToken = session.access_token;
  });

  test.describe("GET /api/profile", () => {
    test("returns user profile when authenticated", async ({ request }) => {
      const response = await request.get("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status()).toBe(200);
      const profile = await response.json();
      expect(profile.user_id).toBe(userId);
    });

    test("returns 401 when not authenticated", async ({ request }) => {
      const response = await request.get("/api/profile");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("PATCH /api/profile", () => {
    test("updates profile fields", async ({ request }) => {
      const updates = {
        bio: "Updated bio",
        skills: ["TypeScript", "React", "Node.js"],
        experience_level: "advanced" as const,
      };

      const response = await request.patch("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: updates,
      });

      expect(response.status()).toBe(200);
      const updatedProfile = await response.json();
      expect(updatedProfile.bio).toBe(updates.bio);
      expect(updatedProfile.skills).toEqual(updates.skills);
      expect(updatedProfile.experience_level).toBe(updates.experience_level);
    });

    test("rejects invalid experience_level", async ({ request }) => {
      const response = await request.patch("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { experience_level: "expert" }, // Invalid
      });

      expect(response.status()).toBe(400);
    });

    test("enforces RLS - cannot update other user profile", async ({
      request,
    }) => {
      // Create second user
      const otherUser = createUser();
      const { userId: otherUserId } = await seedUser(otherUser);

      // Try to update other user's profile
      const response = await request.patch(
        `/api/profile?user_id=${otherUserId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { bio: "Hacked!" },
        },
      );

      // Should return 403 or ignore user_id and update own profile
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("POST /api/profile/extract", () => {
    test("extracts structured data from text description", async ({
      request,
    }) => {
      const description =
        "I am a senior full-stack developer with 5 years of experience in React and Node.js. I work well remotely and am available 20 hours per week.";

      const response = await request.post("/api/profile/extract", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { description },
      });

      expect(response.status()).toBe(200);
      const extracted = await response.json();

      expect(extracted.skills).toContain("React");
      expect(extracted.skills).toContain("Node.js");
      expect(extracted.experience_level).toBe("senior");
      expect(extracted.availability_hours).toBe(20);
    });

    test("handles minimal input gracefully", async ({ request }) => {
      const description = "I like coding";

      const response = await request.post("/api/profile/extract", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { description },
      });

      expect(response.status()).toBe(200);
      const extracted = await response.json();

      // Should return structure even with minimal input
      expect(extracted).toHaveProperty("skills");
      expect(extracted).toHaveProperty("experience_level");
    });

    test("requires authentication", async ({ request }) => {
      const response = await request.post("/api/profile/extract", {
        data: { description: "test" },
      });

      expect(response.status()).toBe(401);
    });
  });
});
