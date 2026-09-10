export function computeStreak(
  rawDates: string[],
  today: string
): { streak: number; lastWorkoutDate: string | null; trainedToday: boolean } {
  if (rawDates.length === 0) {
    return { streak: 0, lastWorkoutDate: null, trainedToday: false };
  }

  const uniqueDates = [...new Set(rawDates)].sort((a, b) => b.localeCompare(a));
  const mostRecent = uniqueDates[0];
  const trainedToday = mostRecent === today;

  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().split("T")[0];

  if (mostRecent !== today && mostRecent !== yesterday) {
    return { streak: 0, lastWorkoutDate: mostRecent, trainedToday: false };
  }

  let streak = 0;
  let expected = mostRecent;

  for (const dateStr of uniqueDates) {
    if (dateStr !== expected) break;

    streak++;
    const next = new Date(expected + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() - 1);
    expected = next.toISOString().split("T")[0];
  }

  return { streak, lastWorkoutDate: mostRecent, trainedToday };
}
