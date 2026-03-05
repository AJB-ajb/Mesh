import { describe, it, expect } from "vitest";
import { optimistic } from "../optimistic";

describe("optimistic", () => {
  it("returns MutatorOptions with the correct shape", () => {
    const data = { id: "1", name: "test" };
    const result = optimistic(data);

    expect(result).toEqual({
      optimisticData: data,
      rollbackOnError: true,
      revalidate: false,
    });
  });

  it("works with array data", () => {
    const data = ["a", "b", "c"];
    const result = optimistic(data);

    expect(result.optimisticData).toBe(data);
    expect(result.rollbackOnError).toBe(true);
    expect(result.revalidate).toBe(false);
  });
});
