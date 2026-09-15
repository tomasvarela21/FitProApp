import { describe, expect, it, vi } from "vitest";
import type { WeeklyPlan } from "@/types";
import { createSerializedSaveQueue, saveWeeklyOverride } from "./weekly-plan-save";

const plan = {
  studentRoutine: { id: "assignment", weekNumber: 1 },
  weeks: [{ weekNumber: 1, version: 3, startDate: null, endDate: null, overrides: [] }],
} as WeeklyPlan;

describe("guardado semanal del frontend", () => {
  it("restaura la caché y recarga cuando el servidor rechaza el guardado", async () => {
    const setCache = vi.fn();
    const reload = vi.fn().mockResolvedValue(undefined);
    const conflict = { response: { status: 409 } };

    await expect(
      saveWeeklyOverride({
        plan,
        weekNumber: 1,
        routineExerciseId: "exercise",
        field: "notes",
        rawValue: "Nueva nota",
        setCache,
        persist: vi.fn().mockRejectedValue(conflict),
        reload,
      })
    ).rejects.toBe(conflict);

    expect(setCache).toHaveBeenCalledTimes(2);
    expect(setCache.mock.calls[0][0].weeks[0]).toMatchObject({
      version: 4,
      overrides: [expect.objectContaining({ notes: "Nueva nota" })],
    });
    expect(setCache.mock.calls[1][0]).toBe(plan);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("serializa ediciones rápidas aunque la primera falle", async () => {
    const queue = createSerializedSaveQueue();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = queue.enqueue(async () => {
      order.push("primera-inicio");
      await firstGate;
      order.push("primera-fin");
      throw new Error("fallo controlado");
    });
    const second = queue.enqueue(async () => {
      order.push("segunda");
    });

    await Promise.resolve();
    expect(order).toEqual(["primera-inicio"]);
    releaseFirst();
    await expect(first).rejects.toThrow("fallo controlado");
    await second;
    expect(order).toEqual(["primera-inicio", "primera-fin", "segunda"]);
  });
});
