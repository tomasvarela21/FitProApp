import type { WeeklyExerciseOverride, WeeklyPlan } from "@/types";

export type WeeklyOverrideField =
  | "suggestedReps"
  | "suggestedWeight"
  | "suggestedRpe"
  | "notes";

type SavedWeek = {
  version: number;
  overrides: WeeklyExerciseOverride[];
};

type SaveWeeklyOverrideOptions = {
  plan: WeeklyPlan;
  weekNumber: number;
  routineExerciseId: string;
  field: WeeklyOverrideField;
  rawValue: string;
  setCache: (plan: WeeklyPlan) => void;
  persist: (
    version: number,
    overrides: WeeklyExerciseOverride[]
  ) => Promise<SavedWeek>;
  reload: () => Promise<unknown>;
};

export async function saveWeeklyOverride({
  plan,
  weekNumber,
  routineExerciseId,
  field,
  rawValue,
  setCache,
  persist,
  reload,
}: SaveWeeklyOverrideOptions): Promise<void> {
  const week = plan.weeks.find((candidate) => candidate.weekNumber === weekNumber);
  if (!week) throw new Error("Semana no encontrada");

  const isNumeric = field === "suggestedWeight" || field === "suggestedRpe";
  const parsedValue = isNumeric
    ? rawValue === "" ? null : Number(rawValue)
    : rawValue === "" ? null : rawValue;
  const existing = week.overrides.find(
    (override) => override.routineExerciseId === routineExerciseId
  );
  const updatedOverride = {
    ...(existing ?? {
      id: `temp-${routineExerciseId}`,
      routineExerciseId,
      weekNumber,
      suggestedWeight: null,
      suggestedReps: null,
      suggestedRpe: null,
      notes: null,
    }),
    [field]: parsedValue,
  } as WeeklyExerciseOverride;
  const overrides = existing
    ? week.overrides.map((override) =>
        override.routineExerciseId === routineExerciseId ? updatedOverride : override
      )
    : [...week.overrides, updatedOverride];

  const optimistic: WeeklyPlan = {
    ...plan,
    weeks: plan.weeks.map((candidate) =>
      candidate.weekNumber === weekNumber
        ? { ...candidate, version: candidate.version + 1, overrides }
        : candidate
    ),
  };
  setCache(optimistic);

  try {
    const saved = await persist(week.version, overrides);
    setCache({
      ...optimistic,
      weeks: optimistic.weeks.map((candidate) =>
        candidate.weekNumber === weekNumber
          ? { ...candidate, version: saved.version, overrides: saved.overrides }
          : candidate
      ),
    });
  } catch (error) {
    setCache(plan);
    await reload();
    throw error;
  }
}

export function createSerializedSaveQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    enqueue(task: () => Promise<void>) {
      const next = tail.then(task, task);
      tail = next.catch(() => undefined);
      return next;
    },
  };
}
