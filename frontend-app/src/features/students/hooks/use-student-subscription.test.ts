import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateBillingQueries } from "./use-student-subscription";

describe("invalidación de vistas de cobros", () => {
  it("marca como obsoletas todas las vistas afectadas por una mutación", async () => {
    const queryClient = new QueryClient();
    const studentId = "student-a";
    const keys = [
      ["subscription", studentId],
      ["student-summary", studentId],
      ["students", 1, "", "ALL"],
      ["payments", 1, "", "ALL"],
      ["dashboard-summary"],
      ["analytics-business"],
      ["student-subscription"],
    ] as const;

    keys.forEach((queryKey) => queryClient.setQueryData(queryKey, { current: true }));

    await invalidateBillingQueries(queryClient, studentId);

    keys.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    });
  });

  it("no invalida el resumen individual de otro alumno", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["student-summary", "student-b"], { current: true });

    await invalidateBillingQueries(queryClient, "student-a");

    expect(
      queryClient.getQueryState(["student-summary", "student-b"])?.isInvalidated
    ).toBe(false);
  });
});
