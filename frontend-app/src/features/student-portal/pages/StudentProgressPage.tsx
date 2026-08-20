import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, TrendingUp, Dumbbell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { studentPortalApi } from "@/api/student-portal.api";
import { parseLocalDate } from "@/lib/utils";
import type { WorkoutProgress } from "@/types";

const formatDate = (d: string) =>
  format(parseLocalDate(d), "d MMM", { locale: es });

const formatDateLong = (d: string) =>
  format(parseLocalDate(d), "d 'de' MMMM yyyy", { locale: es });

// ─── Progress chart + table ───────────────────────────────────────────────────

const ExerciseProgress = ({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) => {
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ["student-progress", exerciseId],
    queryFn: () => studentPortalApi.getProgress(exerciseId).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Sin registros para {exerciseName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Registrá al menos una sesión para ver tu progreso
        </p>
      </div>
    );
  }

  const chartData = progress.map((p: WorkoutProgress) => ({
    date: formatDate(p.date),
    kg: p.maxWeight,
    rpe: p.avgRpe,
    sets: p.totalSets,
    rawDate: p.date,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Peso máximo por sesión (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          {progress.every((p) => p.maxWeight === null) ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No se registró peso en ninguna sesión
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number) => [`${value} kg`, "Peso máx."]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  className="stroke-primary"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historial de sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm" style={{ minWidth: "360px" }}>
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Peso máx.</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">RPE prom.</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Sets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...progress].reverse().map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 text-xs">{formatDateLong(p.date)}</td>
                    <td className="py-2 text-xs text-right">
                      {p.maxWeight != null ? `${p.maxWeight} kg` : "—"}
                    </td>
                    <td className="py-2 text-xs text-right">
                      {p.avgRpe != null ? p.avgRpe : "—"}
                    </td>
                    <td className="py-2 text-xs text-right">{p.totalSets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const StudentProgressPage = () => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");

  const { data: routineData, isLoading } = useQuery({
    queryKey: ["student-routine"],
    queryFn: () => studentPortalApi.getRoutine().then((r) => r.data.data),
  });

  const exercises = routineData?.routine.routineExercises ?? [];

  const uniqueExercises = exercises.reduce<
    { id: string; name: string; muscleGroup: string | null }[]
  >((acc, re) => {
    if (!acc.find((e) => e.id === re.exercise.id)) {
      acc.push({
        id: re.exercise.id,
        name: re.exercise.name,
        muscleGroup: re.exercise.muscleGroup?.name ?? null,
      });
    }
    return acc;
  }, []);

  return (
    <div className="w-full max-w-3xl">
      <PageHeader
        title="Mi progreso"
        description="Evolución de tu rendimiento por ejercicio"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !routineData ? (
        <div className="text-center py-16">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Sin rutina asignada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pedile a tu entrenador que te asigne una rutina
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Exercise list */}
          <div className="min-w-0 md:col-span-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-1 mb-2 uppercase tracking-wide">
              Ejercicios
            </p>
            {uniqueExercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setSelectedExerciseId(ex.id);
                  setSelectedExerciseName(ex.name);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                  selectedExerciseId === ex.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <p className="font-medium leading-tight">{ex.name}</p>
                {ex.muscleGroup && (
                  <p className={`text-xs mt-0.5 ${
                    selectedExerciseId === ex.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}>
                    {ex.muscleGroup}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Progress panel */}
          <div className="min-w-0 md:col-span-2">
            {selectedExerciseId ? (
              <>
                <p className="text-base font-semibold mb-4">{selectedExerciseName}</p>
                <ExerciseProgress
                  exerciseId={selectedExerciseId}
                  exerciseName={selectedExerciseName}
                />
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-3" />
                <p className="text-sm">Seleccioná un ejercicio para ver tu progreso</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
