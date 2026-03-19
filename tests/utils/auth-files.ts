import type { TestUser } from "./factories/user-factory";

/** Paths to saved auth session files created during setup. */
export const authFile = "tests/.auth/user.json";
export const ownerAuthFile = "tests/.auth/owner.json";
export const developerAuthFile = "tests/.auth/developer.json";

/** Read saved storage state + embedded test user metadata. */
export async function loadAuthState(filePath: string): Promise<{
  storageState: { cookies: Array<Record<string, unknown>>; origins: unknown[] };
  testUser: TestUser & { id: string };
}> {
  const fs = await import("fs/promises");
  const raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const { _testUser, ...storageState } = raw;

  if (!_testUser?.id || !_testUser?.email) {
    throw new Error(
      `Auth file ${filePath} is missing or has malformed _testUser data. ` +
        `Re-run the setup project to regenerate it.`,
    );
  }

  return { storageState, testUser: _testUser };
}
