import { describe, expect, it } from "vitest";
import { assertDisposableTestDatabase } from "./test-database";

describe("assertDisposableTestDatabase", () => {
  it("acepta una base local marcada como test", () => {
    expect(
      assertDisposableTestDatabase(
        "postgresql://postgres@127.0.0.1:55432/fitpro_test"
      ).pathname
    ).toBe("/fitpro_test");
  });

  it.each([
    undefined,
    "postgresql://postgres@db.example.com/fitpro_test",
    "postgresql://postgres@127.0.0.1/fitpro",
  ])("rechaza un destino no descartable: %s", (url) => {
    expect(() => assertDisposableTestDatabase(url)).toThrow();
  });
});
