import { describe, it, expect } from "vitest";
import { AppError, apiError, apiSuccess } from "../errors";

describe("AppError", () => {
  it("creates an error with code, message, and statusCode", () => {
    const err = new AppError("NOT_FOUND", "User not found", 404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("User not found");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });

  it("defaults statusCode to 500", () => {
    const err = new AppError("INTERNAL", "Something broke");
    expect(err.statusCode).toBe(500);
  });
});

describe("apiError", () => {
  it("returns a NextResponse with consistent error shape", async () => {
    const response = apiError("UNAUTHORIZED", "Not logged in", 401);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: { code: "UNAUTHORIZED", message: "Not logged in" },
    });
  });

  it("defaults to 500 status", async () => {
    const response = apiError("INTERNAL", "Server error");
    expect(response.status).toBe(500);
  });
});

describe("apiSuccess", () => {
  it("returns a NextResponse with data", async () => {
    const response = apiSuccess({ id: 1, name: "test" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 1, name: "test" });
  });

  it("supports custom status codes", async () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });
});
