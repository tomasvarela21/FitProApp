import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Phone,
  Mail,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useStudentSubscription } from "@/features/student-portal/hooks/use-student-subscription";
import { useStudentProfile } from "@/features/student-portal/hooks/use-student-profile";
import { studentPortalApi } from "@/api/student-portal.api";
import type { StudentRoutineExercise, StudentWorkoutLog } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

const FREQUENCY_LABELS: Record<string, string> = {
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: "lunes",
  TUESDAY: "martes",
  WEDNESDAY: "miércoles",
  THURSDAY: "jueves",
  FRIDAY: "viernes",
  SATURDAY: "sábado",
  SUNDAY: "domingo",
};

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (date: string) =>
  format(new Date(date), "dd 'de' MMMM yyyy", { locale: es });

const formatDateShort = (date: string) =>
  format(new Date(date), "d MMM yyyy", { locale: es });

const parseInitialReps = (reps: string): string => {
  const match = reps.match(/^(\d+)/);
  return match ? match[1] : "";
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SetInput = {
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  notes: string;
};

type ExerciseInput = {
  routineExerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  suggestedSets: number;
  suggestedReps: string;
  suggestedWeight: number | null;
  suggestedRpe: number | null;
  sets: SetInput[];
};

// ─── Small components ─────────────────────────────────────────────────────────

const InstallmentStatusBadge = ({ status }: { status: string }) => {
  if (status === "PAID")
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
        <CheckCircle2 className="w-3 h-3" /> Pagada
      </Badge>
    );
  if (status === "OVERDUE")
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-xs">
        <XCircle className="w-3 h-3" /> Vencida
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
      <Clock className="w-3 h-3" /> Pendiente
    </Badge>
  );
};

// ─── Workout form helpers ─────────────────────────────────────────────────────

const buildExerciseInputs = (exercises: StudentRoutineExercise[]): ExerciseInput[] =>
  exercises.map((re) => ({
    routineExerciseId: re.id,
    exerciseName: re.exercise.name,
    muscleGroup: re.exercise.muscleGroup?.name ?? null,
    suggestedSets: re.sets,
    suggestedReps: re.reps,
    suggestedWeight: re.suggestedWeight,
    suggestedRpe: re.suggestedRpe,
    sets: Array.from({ length: re.sets }, (_, i) => ({
      setNumber: i + 1,
      reps: parseInitialReps(re.reps),
      weight: re.suggestedWeight != null ? String(re.suggestedWeight) : "",
      rpe: re.suggestedRpe != null ? String(re.suggestedRpe) : "",
      notes: "",
    })),
  }));

// ─── Workout Form ─────────────────────────────────────────────────────────────

const WorkoutForm = ({ studentRoutineId, exercises, routineName }: {
  studentRoutineId: string;
  exercises: StudentRoutineExercise[];
  routineName: string;
}) => {
  const queryClient = useQueryClient();
  const [exerciseInputs, setExerciseInputs] = useState<ExerciseInput[]>(
    () => buildExerciseInputs(exercises)
  );
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: studentPortalApi.logWorkout,
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["student-today"] });
      queryClient.invalidateQueries({ queryKey: ["student-workout-history"] });
    },
  });

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof SetInput,
    value: string
  ) => {
    setExerciseInputs((prev) => {
      const next = prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si !== setIdx ? s : { ...s, [field]: value }
          ),
        };
      });
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExerciseInputs((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const nextNum = ex.sets.length + 1;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { setNumber: nextNum, reps: parseInitialReps(ex.suggestedReps), weight: "", rpe: "", notes: "" },
          ],
        };
      })
    );
  };

  const removeSet = (exIdx: number) => {
    setExerciseInputs((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.slice(0, -1) };
      })
    );
  };

  const isValid = exerciseInputs.every((ex) =>
    ex.sets.every((s) => s.reps !== "" && Number(s.reps) > 0)
  );

  const handleSubmit = () => {
    const payload: WorkoutLogInput = {
      date: new Date().toISOString(),
      routineExercises: exerciseInputs.map((ex) => ({
        routineExerciseId: ex.routineExerciseId,
        sets: ex.sets.map((s) => {
          const w = s.weight !== "" ? Number(s.weight) : NaN;
          const r = s.rpe !== "" ? Number(s.rpe) : NaN;
          return {
            setNumber: s.setNumber,
            reps: Number(s.reps),
            weight: !isNaN(w) ? w : undefined,
            rpe: !isNaN(r) ? r : undefined,
            notes: s.notes || undefined,
          };
        }),
      })),
    };
    mutation.mutate(payload);
  };

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-6 py-10 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
        <p className="font-semibold text-emerald-700">¡Entrenamiento registrado!</p>
        <p className="text-sm text-muted-foreground mt-1">Tu sesión fue guardada correctamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{routineName}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Dumbbell className="w-3 h-3" />
          Día de entrenamiento
        </Badge>
      </div>

      {exerciseInputs.map((ex, exIdx) => (
        <Card key={ex.routineExerciseId}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{ex.exerciseName}</p>
                {ex.muscleGroup && (
                  <p className="text-xs text-muted-foreground">{ex.muscleGroup}</p>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0">
                <p>{ex.suggestedSets} × {ex.suggestedReps}</p>
                {ex.suggestedWeight && <p>{ex.suggestedWeight} kg</p>}
                {ex.suggestedRpe && <p>RPE {ex.suggestedRpe}</p>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: "400px" }}>
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-1.5 text-left font-medium text-muted-foreground w-12">Set</th>
                    <th className="pb-1.5 text-left font-medium text-muted-foreground w-20">Reps *</th>
                    <th className="pb-1.5 text-left font-medium text-muted-foreground w-24">Peso (kg)</th>
                    <th className="pb-1.5 text-left font-medium text-muted-foreground w-20">RPE</th>
                    <th className="pb-1.5 text-left font-medium text-muted-foreground">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ex.sets.map((s, setIdx) => (
                    <tr key={setIdx}>
                      <td className="py-1.5 pr-2 text-muted-foreground font-medium">{s.setNumber}</td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={1}
                          value={s.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                          className="h-7 text-xs w-16"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={s.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                          className="h-7 text-xs w-20"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          step={0.5}
                          value={s.rpe}
                          onChange={(e) => updateSet(exIdx, setIdx, "rpe", e.target.value)}
                          className="h-7 text-xs w-16"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-1.5">
                        <Input
                          value={s.notes}
                          onChange={(e) => updateSet(exIdx, setIdx, "notes", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => addSet(exIdx)}
              >
                <Plus className="w-3 h-3" />
                Set
              </Button>
              {ex.sets.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => removeSet(exIdx)}
                >
                  <Minus className="w-3 h-3" />
                  Quitar último
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {mutation.isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? "Error al registrar el entrenamiento"}
          </p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!isValid || mutation.isPending}
        className="w-full gap-2"
      >
        {mutation.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Registrando...</>
        ) : (
          <><Dumbbell className="w-4 h-4" />Registrar entrenamiento</>
        )}
      </Button>
    </div>
  );
};

// ─── Tab: Entrenar hoy ────────────────────────────────────────────────────────

const getNextTrainingDay = (todayIdx: number, trainingDays: string[]): string | null => {
  for (let i = 1; i <= 7; i++) {
    const candidate = DAY_ORDER[(todayIdx + i) % 7];
    if (trainingDays.includes(candidate)) return candidate;
  }
  return null;
};

const TodayTab = () => {
  const today = DAY_MAP[new Date().getDay()];
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ["student-today"],
    queryFn: () => studentPortalApi.getTodayWorkout().then((r) => r.data.data),
  });

  const { data: routineData, isLoading: loadingRoutine } = useQuery({
    queryKey: ["student-routine"],
    queryFn: () => studentPortalApi.getRoutine().then((r) => r.data.data),
    enabled: !todayData,
  });

  const { data: historyData } = useQuery({
    queryKey: ["student-workout-history"],
    queryFn: () => studentPortalApi.getWorkoutHistory().then((r) => r.data.data),
  });

  if (loadingToday || (loadingRoutine && !todayData)) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!todayData) {
    const todayIdx = DAY_ORDER.indexOf(today);
    const trainingDays = routineData?.routine.daysOfWeek ?? [];
    const nextDay = getNextTrainingDay(todayIdx, trainingDays);
    return <NoTrainingToday nextDay={nextDay} hasRoutine={!!routineData} />;
  }

  const alreadyLogged = historyData?.some((log) => log.date.split("T")[0] === todayStr);

  if (alreadyLogged && historyData) {
    const todayLog = historyData.find((log) => log.date.split("T")[0] === todayStr);
    return <AlreadyLogged log={todayLog!} routineName={todayData.routine.name} />;
  }

  const exercises = todayData.routine.routineExercises
    .sort((a, b) => a.order - b.order);

  return (
    <WorkoutForm
      studentRoutineId={todayData.studentRoutineId}
      exercises={exercises}
      routineName={todayData.routine.name}
    />
  );
};

const NoTrainingToday = ({
  nextDay,
  hasRoutine,
}: {
  nextDay: string | null;
  hasRoutine: boolean;
}) => {
  if (!hasRoutine) {
    return (
      <div className="text-center py-16">
        <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Sin rutina asignada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Consultá con tu entrenador para que te asigne una rutina.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">💪</div>
      <p className="font-semibold text-lg">Hoy no entrenás</p>
      {nextDay ? (
        <p className="text-sm text-muted-foreground mt-2">
          Tu próximo día de entrenamiento es el{" "}
          <span className="font-medium text-foreground">{DAY_LABELS[nextDay]}</span>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">Descansá y recuperate.</p>
      )}
    </div>
  );
};

const AlreadyLogged = ({
  log,
  routineName,
}: {
  log: StudentWorkoutLog;
  routineName: string;
}) => {
  const exerciseMap = log.sets.reduce<Record<string, { name: string; sets: typeof log.sets }>>(
    (acc, s) => {
      const key = s.exercise.id;
      if (!acc[key]) acc[key] = { name: s.exercise.name, sets: [] };
      acc[key].sets.push(s);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-700">Ya registraste tu entrenamiento de hoy</p>
          <p className="text-xs text-muted-foreground">{routineName} — {log.sets.length} sets totales</p>
        </div>
      </div>
      <div className="space-y-3">
        {Object.values(exerciseMap).map(({ name, sets }) => (
          <Card key={name}>
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">{name}</p>
              <div className="space-y-1">
                {sets.map((s) => (
                  <div key={s.id} className="flex gap-4 text-xs text-muted-foreground">
                    <span className="w-10 font-medium text-foreground">Set {s.setNumber}</span>
                    <span>{s.reps} reps</span>
                    {s.weight != null && <span>{s.weight} kg</span>}
                    {s.rpe != null && <span>RPE {s.rpe}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── Tab: Historial ───────────────────────────────────────────────────────────

const HistorialTab = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["student-workout-history"],
    queryFn: () => studentPortalApi.getWorkoutHistory().then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Sin entrenamientos registrados</p>
        <p className="text-xs text-muted-foreground mt-1">
          Completá tu primer entrenamiento en la pestaña "Entrenar hoy"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((log) => {
        const isExpanded = expandedId === log.id;
        const exerciseMap = log.sets.reduce<Record<string, { name: string; sets: typeof log.sets }>>(
          (acc, s) => {
            const key = s.exercise.id;
            if (!acc[key]) acc[key] = { name: s.exercise.name, sets: [] };
            acc[key].sets.push(s);
            return acc;
          },
          {}
        );

        return (
          <div key={log.id} className="rounded-md border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div>
                <p className="text-sm font-medium">{formatDateShort(log.date)}</p>
                <p className="text-xs text-muted-foreground">
                  {log.sets.length} set{log.sets.length !== 1 ? "s" : ""} registrado{log.sets.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-3 bg-muted/10 space-y-4">
                {log.notes && (
                  <p className="text-xs text-muted-foreground italic">{log.notes}</p>
                )}
                {Object.values(exerciseMap).map(({ name, sets }) => (
                  <div key={name}>
                    <p className="text-xs font-semibold mb-1.5">{name}</p>
                    <div className="space-y-1">
                      {sets.map((s) => (
                        <div key={s.id} className="flex gap-4 text-xs text-muted-foreground">
                          <span className="w-10 font-medium text-foreground">Set {s.setNumber}</span>
                          <span>{s.reps} reps</span>
                          {s.weight != null && <span>{s.weight} kg</span>}
                          {s.rpe != null && <span>RPE {s.rpe}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const StudentDashboardPage = () => {
  const { subscription, isLoading: isLoadingSubscription } = useStudentSubscription();
  const { profile, isLoading: isLoadingProfile } = useStudentProfile();

  const isLoading = isLoadingSubscription || isLoadingProfile;
  const firstName = profile?.firstName ?? "Alumno";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Tu entrenamiento y plan en un solo lugar"
      />

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Entrenar hoy</TabsTrigger>
          <TabsTrigger value="plan" className="flex-1">Mi plan</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Historial</TabsTrigger>
        </TabsList>

        {/* Tab: Entrenar hoy */}
        <TabsContent value="today">
          <TodayTab />
        </TabsContent>

        {/* Tab: Mi plan */}
        <TabsContent value="plan">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {subscription ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Tu plan actual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{subscription.planName}</p>
                            <p className="text-xs text-muted-foreground">
                              {DURATION_LABELS[subscription.planDuration]} —{" "}
                              {subscription.installmentCount} cuota
                              {subscription.installmentCount > 1 ? "s" : ""}{" "}
                              {FREQUENCY_LABELS[subscription.frequency].toLowerCase()}es
                            </p>
                          </div>
                          {subscription.daysUntilExpiry < 0 ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                              <XCircle className="w-3 h-3" /> Vencido
                            </Badge>
                          ) : subscription.daysUntilExpiry <= 7 ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                              <AlertTriangle className="w-3 h-3" /> Por vencer
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Vigente
                            </Badge>
                          )}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-bold">
                              ${subscription.totalAmount.toLocaleString("es-AR")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pagado</p>
                            <p className="text-sm font-bold text-emerald-600">
                              ${subscription.paidAmount.toLocaleString("es-AR")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                            <p className="text-sm font-bold text-amber-600">
                              ${subscription.pendingAmount.toLocaleString("es-AR")}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Inicio</p>
                            <p className="font-medium">{formatDate(subscription.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vencimiento</p>
                            <p className="font-medium">{formatDate(subscription.endDate)}</p>
                          </div>
                        </div>
                      </div>

                      {subscription.nextInstallment && (
                        <div className={`rounded-lg border px-4 py-3 ${
                          subscription.nextInstallment.status === "OVERDUE"
                            ? "bg-red-500/5 border-red-500/20"
                            : "bg-amber-500/5 border-amber-500/20"
                        }`}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Próxima cuota
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                Cuota {subscription.nextInstallment.number} —{" "}
                                ${subscription.nextInstallment.amount.toLocaleString("es-AR")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {subscription.nextInstallment.status === "OVERDUE"
                                  ? "Vencida el "
                                  : "Vence el "}
                                {formatDate(subscription.nextInstallment.dueDate)}
                              </p>
                            </div>
                            <InstallmentStatusBadge status={subscription.nextInstallment.status} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Historial de cuotas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {subscription.installments.map((installment) => (
                          <div
                            key={installment.id}
                            className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border bg-muted/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                {installment.number}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  ${installment.amount.toLocaleString("es-AR")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {installment.status === "PAID" && installment.paidAt
                                    ? `Pagada el ${formatDate(installment.paidAt)}`
                                    : `Vence ${formatDate(installment.dueDate)}`}
                                </p>
                                {installment.notes && (
                                  <p className="text-xs text-muted-foreground italic">
                                    {installment.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <InstallmentStatusBadge status={installment.status} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No tenés un plan asignado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consultá con tu entrenador para que te asigne un plan
                    </p>
                  </CardContent>
                </Card>
              )}

              {profile?.trainer && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tu entrenador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-base font-bold shrink-0">
                        {profile.trainer.firstName[0]}
                        {profile.trainer.lastName[0]}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {profile.trainer.firstName} {profile.trainer.lastName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {profile.trainer.email}
                        </div>
                        {profile.trainer.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {profile.trainer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history">
          <HistorialTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
