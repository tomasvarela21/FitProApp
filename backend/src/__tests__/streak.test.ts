import { describe, it, expect } from "vitest";
import { computeStreak } from "../modules/student-portal/workout.service";

const TODAY = "2026-08-20";
const yesterday = (d: string) => {
  const dt = new Date(d + "T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split("T")[0];
};
const YESTERDAY = yesterday(TODAY);

describe("computeStreak", () => {
  it("devuelve 0 cuando no hay logs", () => {
    const r = computeStreak([], TODAY);
    expect(r.streak).toBe(0);
    expect(r.lastWorkoutDate).toBeNull();
    expect(r.trainedToday).toBe(false);
  });

  it("streak de 1 cuando solo entrenó hoy", () => {
    const r = computeStreak([TODAY], TODAY);
    expect(r.streak).toBe(1);
    expect(r.trainedToday).toBe(true);
  });

  it("streak activo cuando entrenó ayer (grace period)", () => {
    const r = computeStreak([YESTERDAY], TODAY);
    expect(r.streak).toBe(1);
    expect(r.trainedToday).toBe(false);
  });

  it("racha rota si el último entrenamiento fue hace 2+ días", () => {
    const twoDaysAgo = yesterday(YESTERDAY);
    const r = computeStreak([twoDaysAgo], TODAY);
    expect(r.streak).toBe(0);
  });

  it("cuenta días consecutivos correctamente", () => {
    const d2 = yesterday(TODAY);     // 2026-08-19
    const d3 = yesterday(d2);        // 2026-08-18
    const r = computeStreak([TODAY, d2, d3], TODAY);
    expect(r.streak).toBe(3);
  });

  it("para en el primer día roto", () => {
    const d2 = yesterday(TODAY);
    const d4 = yesterday(yesterday(d2)); // salta un día
    const r = computeStreak([TODAY, d2, d4], TODAY);
    expect(r.streak).toBe(2);
  });

  it("deduplica logs del mismo día", () => {
    const r = computeStreak([TODAY, TODAY, TODAY], TODAY);
    expect(r.streak).toBe(1);
  });

  it("racha larga — 7 días consecutivos", () => {
    const dates: string[] = [];
    let cur = TODAY;
    for (let i = 0; i < 7; i++) {
      dates.push(cur);
      cur = yesterday(cur);
    }
    const r = computeStreak(dates, TODAY);
    expect(r.streak).toBe(7);
  });

  it("devuelve trainedToday=false si el último log fue ayer", () => {
    const r = computeStreak([YESTERDAY, yesterday(YESTERDAY)], TODAY);
    expect(r.trainedToday).toBe(false);
    expect(r.streak).toBe(2);
  });
});
