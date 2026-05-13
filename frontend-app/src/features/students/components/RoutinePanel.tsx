import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, ClipboardList, Plus, RefreshCw,
  ChevronDown, ChevronUp, Check, X, Calendar, Copy, CheckCircle2, PlayCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { routinesApi } from "@/api/routines.api";
import { exercisesApi } from "@/api/exercises.api";
import { weeklyPlanApi } from "@/api/weekly-plan.api";
import { getRoutineDays } from "@/types";
import type { WeeklyPlan } from "@/types";
import { ExerciseTutorialDialog } from "@/features/student-portal/components/ExerciseTutorialDialog";
import type { TutorialExercise } from "@/features/student-portal/components/ExerciseTutorialDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié",
  THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom",
};

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_OPTIONS = DAY_ORDER.map((d) => ({ value: d, label: DAY_LABELS[d] }));

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
  notes: string | null;
  exercise: { id: string; name: string; order: number };
};

type WorkoutHistory = {
  id: string;
  date: string;
  notes: string | null;
  sets: WorkoutSet[];
};

type Props = { studentId: string };

// ─── InlineCell ───────────────────────────────────────────────────────────────

type InlineCellProps = {
  value: string | number | null | undefined;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onSave: (val: string) => Promise<void>;
};

const InlineCell = ({ value, type = "text", min, max, step, placeholder, onSave }: InlineCellProps) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (saving) return;
    setInputVal(value?.toString() ?? "");
    setEditing(true);
  };

  const save = async () => {
    const newVal = inputVal.trim();
    const oldVal = value?.toString().trim() ?? "";
    setEditing(false);
    if (newVal === oldVal) return;
    setSaving(true);
    try {
      await onSave(newVal);
    } catch {
      // query invalidation restores original value
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") setEditing(false);
  };

  if (saving) {
    return <span className="flex items-center py-0.5"><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /></span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        min={min}
        max={max}
        step={step}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-0 border-b border-primary outline-none text-xs leading-none py-0.5 w-full"
      />
    );
  }

  const display = value !== null && value !== undefined && value !== "" ? String(value) : null;

  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-left text-xs py-0.5 block w-full cursor-pointer hover:text-primary"
    >
      {display ?? <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
    </button>
  );
};

// ─── Add Exercise Dialog ──────────────────────────────────────────────────────

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  dayOfWeek: z.string().min(1, "El día es obligatorio"),
  order: z.number().int().min(1),
  sets: z.number().int().min(1, "Mínimo 1 serie"),
  reps: z.string().min(1, "Las reps son obligatorias"),
  suggestedWeight: z.number().min(0).optional(),
  suggestedRpe: z.number().min(0).max(10).optional(),
  restSeconds: z.number().int().min(0),
  notes: z.string().optional(),
});

type AddExerciseForm = z.infer<typeof addExerciseSchema>;

const AddExerciseDialog = ({
  open,
  onClose,
  routineId,
  studentId,
  nextOrder,
  defaultDay,
}: {
  open: boolean;
  onClose: () => void;
  routineId: string;
  studentId: string;
  nextOrder: number;
  defaultDay?: string;
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const { data: allExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => exercisesApi.list().then((r) => r.data.data),
    enabled: open,
  });

  const filtered = exerciseSearch
    ? allExercises.filter((e) => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : allExercises;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddExerciseForm>({
    resolver: zodResolver(addExerciseSchema),
    defaultValues: { restSeconds: 90 },
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setExerciseSearch("");
    reset({ restSeconds: 90, order: nextOrder, dayOfWeek: defaultDay ?? "" });
  }, [open]);

  const handleClose = () => { reset(); setError(null); onClose(); };

  const onSubmit = async (data: AddExerciseForm) => {
    setError(null);
    try {
      const payload = {
        ...data,
        suggestedWeight: data.suggestedWeight !== undefined && !isNaN(data.suggestedWeight) ? data.suggestedWeight : undefined,
        suggestedRpe: data.suggestedRpe !== undefined && !isNaN(data.suggestedRpe) ? data.suggestedRpe : undefined,
        notes: data.notes || undefined,
      };
      await routinesApi.addExercise(routineId, payload);
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al agregar el ejercicio";
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
          <DialogDescription>Seleccioná un ejercicio y configurá las variables</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Día</Label>
            <Controller
              name="dayOfWeek"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.dayOfWeek && <p className="text-xs text-destructive">{errors.dayOfWeek.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Ejercicio</Label>
            <Input
              placeholder="Buscar ejercicio..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
            />
            <Controller
              name="exerciseId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un ejercicio" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {filtered.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.name}
                        {ex.muscleGroup && (
                          <span className="text-muted-foreground ml-1">· {ex.muscleGroup.name}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.exerciseId && <p className="text-xs text-destructive">{errors.exerciseId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-sets">Series</Label>
              <Input id="p-sets" type="number" min={1} {...register("sets", { valueAsNumber: true })} />
              {errors.sets && <p className="text-xs text-destructive">{errors.sets.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-reps">Reps</Label>
              <Input id="p-reps" placeholder="Ej: 8-10" {...register("reps")} />
              {errors.reps && <p className="text-xs text-destructive">{errors.reps.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-rest">Descanso (s)</Label>
              <Input id="p-rest" type="number" min={0} {...register("restSeconds", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-weight">Peso sug. (kg) <span className="text-muted-foreground text-xs">(opc.)</span></Label>
              <Input id="p-weight" type="number" min={0} step={0.5} placeholder="—" {...register("suggestedWeight", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-rpe">RPE sug. <span className="text-muted-foreground text-xs">(1-10)</span></Label>
              <Input id="p-rpe" type="number" min={0} max={10} step={0.5} placeholder="—" {...register("suggestedRpe", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="p-notes" placeholder="Indicaciones adicionales" {...register("notes")} />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-3 sm:gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Agregando...</> : "Agregar ejercicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Assign Routine Dialog ────────────────────────────────────────────────────

const AssignRoutineDialog = ({
  open, onClose, studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
}) => {
  const queryClient = useQueryClient();
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: routines = [] } = useQuery({
    queryKey: ["routines"],
    queryFn: () => routinesApi.list().then((r) => r.data.data),
    enabled: open,
  });

  const handleAssign = async () => {
    if (!selectedRoutineId) return;
    setIsLoading(true);
    setError(null);
    try {
      await routinesApi.assignToStudent(studentId, { routineId: selectedRoutineId });
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
      queryClient.invalidateQueries({ queryKey: ["workout-history", studentId] });
      setSelectedRoutineId("");
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al asignar la rutina";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => { setSelectedRoutineId(""); setError(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar rutina</DialogTitle>
          <DialogDescription>Seleccioná la rutina que querés asignar a este alumno</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Rutina</Label>
            <Select value={selectedRoutineId} onValueChange={setSelectedRoutineId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una rutina" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {routines.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.isGlobal && <span className="text-muted-foreground ml-1">· Global</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
          <Button className="flex-1" onClick={handleAssign} disabled={isLoading || !selectedRoutineId}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Asignando...</> : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Create Weekly Plan Dialog ───────────────────────────────────────────────

const CreateWeeklyPlanDialog = ({
  open,
  onClose,
  studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
}) => {
  const queryClient = useQueryClient();
  const [routineId, setRoutineId] = useState("");
  const [weekCount, setWeekCount] = useState(4);
  const [startDates, setStartDates] = useState<string[]>(Array(12).fill(""));
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: routines = [] } = useQuery({
    queryKey: ["routines"],
    queryFn: () => routinesApi.list().then((r) => r.data.data),
    enabled: open,
  });

  const handleClose = () => {
    setRoutineId("");
    setWeekCount(4);
    setStartDates(Array(12).fill(""));
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!routineId) return;
    setIsLoading(true);
    setError(null);
    try {
      await weeklyPlanApi.create(studentId, {
        routineId,
        weeks: Array.from({ length: weekCount }, (_, i) => ({
          weekNumber: i + 1,
          startDate: startDates[i] || undefined,
        })),
        notes: notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al crear el plan semanal";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Crear plan semanal</DialogTitle>
          <DialogDescription>Configurá la periodización semanal para este alumno</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Rutina</Label>
            <Select value={routineId} onValueChange={setRoutineId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una rutina" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {routines.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.isGlobal && <span className="text-muted-foreground ml-1">· Global</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Número de semanas</Label>
            <Select value={String(weekCount)} onValueChange={(v) => setWeekCount(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} semana{n !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Array.from({ length: weekCount }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Label>
                Inicio semana {i + 1}{" "}
                <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              <Input
                type="date"
                value={startDates[i] ?? ""}
                onChange={(e) => {
                  const next = [...startDates];
                  next[i] = e.target.value;
                  setStartDates(next);
                }}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label>
              Notas <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Input
              placeholder="Indicaciones generales del plan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isLoading || !routineId}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Weekly Plan Tab ──────────────────────────────────────────────────────────

const WeeklyPlanTabContent = ({ studentId }: { studentId: string }) => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [copyingWeek, setCopyingWeek] = useState(false);

  const { data: weeklyPlan, isLoading } = useQuery<WeeklyPlan | null>({
    queryKey: ["weekly-plan", studentId],
    queryFn: async () => {
      try {
        const r = await weeklyPlanApi.get(studentId);
        return r.data.data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
  });

  // sync selected week to active week on first load
  if (weeklyPlan && !initialized) {
    setSelectedWeek(weeklyPlan.studentRoutine.weekNumber);
    setInitialized(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="h-4 bg-muted rounded w-40" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
          <div className="h-5 bg-muted rounded w-20" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-7 bg-muted rounded w-16" />)}
        </div>
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (!weeklyPlan) {
    return (
      <>
        <CreateWeeklyPlanDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          studentId={studentId}
        />
        <div className="text-center py-6">
          <Calendar className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Sin plan semanal</p>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Crear plan semanal
          </Button>
        </div>
      </>
    );
  }

  const routine = weeklyPlan.studentRoutine.routine;
  const activeWeek = weeklyPlan.studentRoutine.weekNumber;
  const maxWeekInOverrides = weeklyPlan.weeks.reduce((max, w) => Math.max(max, w.weekNumber), 0);
  const totalWeeks = Math.max(4, maxWeekInOverrides);
  const weekTabs = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  const currentOverrides =
    weeklyPlan.weeks.find((w) => w.weekNumber === selectedWeek)?.overrides ?? [];
  const overrideMap = new Map(currentOverrides.map((o) => [o.routineExerciseId, o]));

  const exercisesByDay = DAY_ORDER.reduce<
    Record<string, typeof routine.routineExercises>
  >((acc, day) => {
    const exs = routine.routineExercises
      .filter((re) => re.dayOfWeek === day)
      .sort((a, b) => a.order - b.order);
    if (exs.length > 0) acc[day] = exs;
    return acc;
  }, {});

  const handleOverrideSave = async (
    routineExerciseId: string,
    field: "suggestedReps" | "suggestedWeight" | "suggestedRpe" | "notes",
    rawVal: string
  ) => {
    const numericFields: string[] = ["suggestedWeight", "suggestedRpe"];
    const parsedValue = numericFields.includes(field)
      ? rawVal === ""
        ? null
        : Number(rawVal)
      : rawVal === ""
        ? null
        : rawVal;

    const existingOverride = overrideMap.get(routineExerciseId);
    const newOverride = existingOverride
      ? { ...existingOverride, [field]: parsedValue }
      : {
          id: `temp-${routineExerciseId}`,
          routineExerciseId,
          weekNumber: selectedWeek,
          suggestedWeight: null,
          suggestedReps: null,
          suggestedRpe: null,
          notes: null,
          [field]: parsedValue,
        };

    const newOverrides = existingOverride
      ? currentOverrides.map((o) =>
          o.routineExerciseId === routineExerciseId ? newOverride : o
        )
      : [...currentOverrides, newOverride];

    queryClient.setQueryData<WeeklyPlan | null>(["weekly-plan", studentId], (old) => {
      if (!old) return old;
      const weekExists = old.weeks.some((w) => w.weekNumber === selectedWeek);
      return {
        ...old,
        weeks: weekExists
          ? old.weeks.map((w) =>
              w.weekNumber === selectedWeek ? { ...w, overrides: newOverrides } : w
            )
          : [
              ...old.weeks,
              { weekNumber: selectedWeek, startDate: null, endDate: null, overrides: newOverrides },
            ],
      };
    });

    await weeklyPlanApi.updateWeek(
      studentId,
      selectedWeek,
      newOverrides.map((o) => ({
        routineExerciseId: o.routineExerciseId,
        suggestedWeight: o.suggestedWeight,
        suggestedReps: o.suggestedReps,
        suggestedRpe: o.suggestedRpe,
        notes: o.notes,
      }))
    );
    queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
  };

  const handleCopyFromPrev = async () => {
    if (selectedWeek <= 1) return;
    setCopyingWeek(true);
    try {
      await weeklyPlanApi.copyWeek(studentId, selectedWeek - 1, selectedWeek);
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
    } finally {
      setCopyingWeek(false);
    }
  };

  const handleSetActiveWeek = async () => {
    setSettingActive(true);
    try {
      await weeklyPlanApi.setActiveWeek(studentId, selectedWeek);
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
    } finally {
      setSettingActive(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{routine.name}</p>
          {routine.description && (
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{routine.description}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs w-fit shrink-0">
          Semana {activeWeek} activa
        </Badge>
      </div>

      {/* Week tabs */}
      <div className="flex gap-1 border-b border-border -mx-4 px-4 overflow-x-auto">
        {weekTabs.map((wn) => (
          <button
            key={wn}
            type="button"
            onClick={() => setSelectedWeek(wn)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5",
              selectedWeek === wn
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Semana {wn}
            {wn === activeWeek && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {Object.entries(exercisesByDay).map(([day, exercises]) => (
          <div key={day}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {DAY_LABELS[day]}
            </p>
            {exercises.map((re) => {
              const override = overrideMap.get(re.id);
              return (
                <div
                  key={re.id}
                  className="rounded-lg border border-border bg-muted/10 p-3 space-y-3 mb-2"
                >
                  <div>
                    <p className="text-sm font-semibold break-words">{re.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {re.exercise.muscleGroup?.name ?? "Sin grupo muscular"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Reps base</p>
                      <p className="font-medium text-muted-foreground/70">{re.reps}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reps semana</p>
                      <InlineCell
                        value={override?.suggestedReps ?? null}
                        placeholder={re.reps}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedReps", v)}
                      />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Peso base</p>
                      <p className="font-medium text-muted-foreground/70">
                        {re.suggestedWeight ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Peso semana</p>
                      <InlineCell
                        value={override?.suggestedWeight ?? null}
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder={re.suggestedWeight?.toString() ?? "—"}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedWeight", v)}
                      />
                    </div>
                    <div>
                      <p className="text-muted-foreground">RPE base</p>
                      <p className="font-medium text-muted-foreground/70">
                        {re.suggestedRpe ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">RPE semana</p>
                      <InlineCell
                        value={override?.suggestedRpe ?? null}
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        placeholder={re.suggestedRpe?.toString() ?? "—"}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedRpe", v)}
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notas semana</p>
                      <InlineCell
                        value={override?.notes ?? null}
                        placeholder="—"
                        onSave={(v) => handleOverrideSave(re.id, "notes", v)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {Object.keys(exercisesByDay).length === 0 && (
          <p className="text-xs text-muted-foreground py-2">Sin ejercicios en la rutina</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto -mx-4 px-4 pb-1 md:block">
        <table className="w-full text-sm" style={{ minWidth: "920px" }}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">#</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Ejercicio</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Grupo</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground/60">
                Reps base
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Reps sem.</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground/60">
                Peso base
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Peso sem.</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground/60">
                RPE base
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">RPE sem.</th>
              <th className="px-2 py-2 text-left font-medium text-muted-foreground">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.entries(exercisesByDay).flatMap(([day, exercises]) => [
              <tr key={`day-${day}`} className="bg-muted/20">
                <td colSpan={10} className="px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {DAY_LABELS[day]}
                  </span>
                </td>
              </tr>,
              ...exercises.map((re) => {
                const override = overrideMap.get(re.id);
                return (
                  <tr key={re.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-2 py-2 text-muted-foreground">{re.order}</td>
                    <td className="px-2 py-2 font-medium">
                      <span className="block max-w-44 truncate">{re.exercise.name}</span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      <span className="block max-w-32 truncate">
                        {re.exercise.muscleGroup?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground/60 text-xs">{re.reps}</td>
                    <td className="px-2 py-2">
                      <InlineCell
                        value={override?.suggestedReps ?? null}
                        placeholder={re.reps}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedReps", v)}
                      />
                    </td>
                    <td className="px-2 py-2 text-muted-foreground/60 text-xs">
                      {re.suggestedWeight ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <InlineCell
                        value={override?.suggestedWeight ?? null}
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder={re.suggestedWeight?.toString() ?? "—"}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedWeight", v)}
                      />
                    </td>
                    <td className="px-2 py-2 text-muted-foreground/60 text-xs">
                      {re.suggestedRpe ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <InlineCell
                        value={override?.suggestedRpe ?? null}
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        placeholder={re.suggestedRpe?.toString() ?? "—"}
                        onSave={(v) => handleOverrideSave(re.id, "suggestedRpe", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <InlineCell
                        value={override?.notes ?? null}
                        placeholder="—"
                        onSave={(v) => handleOverrideSave(re.id, "notes", v)}
                      />
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
        {Object.keys(exercisesByDay).length === 0 && (
          <p className="text-xs text-muted-foreground py-3">Sin ejercicios en la rutina</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs h-8"
          onClick={handleCopyFromPrev}
          disabled={selectedWeek <= 1 || copyingWeek}
        >
          {copyingWeek ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Copiar desde sem. anterior
        </Button>
        <Button
          variant={selectedWeek === activeWeek ? "secondary" : "outline"}
          size="sm"
          className="gap-2 text-xs h-8"
          onClick={handleSetActiveWeek}
          disabled={settingActive || selectedWeek === activeWeek}
        >
          {settingActive ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {selectedWeek === activeWeek ? "Semana activa" : "Establecer como activa"}
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const RoutinePanel = ({ studentId }: Props) => {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tutorialExercise, setTutorialExercise] = useState<TutorialExercise | null>(null);

  const { data: studentRoutine, isLoading: loadingRoutine } = useQuery({
    queryKey: ["student-routine", studentId],
    queryFn: () => routinesApi.getStudentRoutine(studentId).then((r) => r.data.data),
  });

  const { data: workoutHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["workout-history", studentId],
    queryFn: () =>
      routinesApi
        .getStudentWorkoutHistory(studentId)
        .then((r) => r.data.data as unknown as WorkoutHistory[]),
  });

  const routine = studentRoutine?.routine ?? null;
  const routineId = routine?.id ?? "";
  const isOwn = routine ? !routine.isGlobal : false;
  const sortedDays = routine ? getRoutineDays(routine) : [];

  const resolvedDay = activeDay && sortedDays.includes(activeDay)
    ? activeDay
    : sortedDays[0] ?? null;

  const dayExercises = routine && resolvedDay
    ? [...(routine.routineExercises ?? [])]
        .filter((re) => re.dayOfWeek === resolvedDay)
        .sort((a, b) => a.order - b.order)
    : [];

  const handleCellSave = async (routineExerciseId: string, field: string, rawVal: string) => {
    const numericFields = ["sets", "suggestedWeight", "suggestedRpe", "restSeconds", "order"];
    const value = numericFields.includes(field)
      ? rawVal === "" ? null : Number(rawVal)
      : rawVal === "" ? null : rawVal;
    queryClient.setQueryData(["student-routine", studentId], (old: typeof studentRoutine) => {
      if (!old?.routine) return old;
      return {
        ...old,
        routine: {
          ...old.routine,
          routineExercises: old.routine.routineExercises.map((re) =>
            re.id === routineExerciseId ? { ...re, [field]: value } : re
          ),
        },
      };
    });
    try {
      await routinesApi.updateExercise(routineId, routineExerciseId, { [field]: value });
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", studentId] });
    }
  };

  const handleDelete = async (routineExerciseId: string) => {
    setDeletingId(routineExerciseId);
    try {
      await routinesApi.removeExercise(routineId, routineExerciseId);
      queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
      setConfirmingDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <AssignRoutineDialog open={assignOpen} onClose={() => setAssignOpen(false)} studentId={studentId} />
      <ExerciseTutorialDialog
        exercise={tutorialExercise}
        open={!!tutorialExercise}
        onClose={() => setTutorialExercise(null)}
      />

      {routine && (
        <AddExerciseDialog
          open={addExerciseOpen}
          onClose={() => setAddExerciseOpen(false)}
          routineId={routineId}
          studentId={studentId}
          nextOrder={dayExercises.length + 1}
          defaultDay={resolvedDay ?? undefined}
        />
      )}

      <Card className="max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Rutinas y entrenamientos
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="routine" className="w-full">
            <TabsList variant="line" className="w-full rounded-none border-b border-border h-auto p-0 justify-start overflow-x-auto">
              <TabsTrigger value="routine" className="py-2.5">Rutina activa</TabsTrigger>
              <TabsTrigger value="history" className="py-2.5">Historial</TabsTrigger>
              <TabsTrigger value="weekly-plan" className="py-2.5">Plan semanal</TabsTrigger>
            </TabsList>

            {/* Tab: Rutina activa */}
            <TabsContent value="routine" className="p-4 space-y-4">
              {loadingRoutine ? (
                <div className="space-y-3 animate-pulse">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                    <div className="h-7 bg-muted rounded w-20 shrink-0" />
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => <div key={i} className="h-5 bg-muted rounded w-10" />)}
                  </div>
                  <div className="h-px bg-muted" />
                  <div className="h-40 bg-muted rounded" />
                </div>
              ) : studentRoutine && routine ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{routine.name}</p>
                      {routine.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{routine.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Asignada el {formatDate(studentRoutine.assignedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-fit gap-1.5 text-xs shrink-0"
                      onClick={() => setAssignOpen(true)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Cambiar
                    </Button>
                  </div>

                  {/* Day badges */}
                  {sortedDays.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sortedDays.map((d) => (
                        <Badge key={d} variant="outline" className="text-xs px-1.5 py-0">
                          {DAY_SHORT[d]}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Day tabs */}
                  {sortedDays.length > 0 && (
                    <div className="flex gap-1 border-b border-border -mx-4 px-4 overflow-x-auto">
                      {sortedDays.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setActiveDay(day)}
                          className={cn(
                            "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                            resolvedDay === day
                              ? "border-primary text-foreground"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Exercise table */}
                  {sortedDays.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Sin ejercicios</p>
                  ) : dayExercises.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Sin ejercicios para este día</p>
                  ) : (
                    <>
                    <div className="space-y-3 md:hidden">
                      {dayExercises.map((re) => {
                        const isConfirming = confirmingDeleteId === re.id;
                        const isDeleting = deletingId === re.id;

                        return (
                          <div
                            key={re.id}
                            className="rounded-lg border border-border bg-muted/10 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold break-words">
                                    {re.exercise.name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setTutorialExercise({
                                      name: re.exercise.name,
                                      muscleGroup: re.exercise.muscleGroup?.name ?? null,
                                      mediaUrl: re.exercise.mediaUrl,
                                      mediaType: re.exercise.mediaType,
                                      description: re.exercise.description,
                                    })}
                                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    title="Ver tutorial"
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {re.exercise.muscleGroup?.name ?? "Sin grupo muscular"}
                                </p>
                              </div>
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                                {re.order}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Series</p>
                                <InlineCell
                                  value={re.sets}
                                  type="number"
                                  min={1}
                                  onSave={(v) => handleCellSave(re.id, "sets", v)}
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Reps</p>
                                <InlineCell
                                  value={re.reps}
                                  onSave={(v) => handleCellSave(re.id, "reps", v)}
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Peso sug.</p>
                                <InlineCell
                                  value={re.suggestedWeight}
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="—"
                                  onSave={(v) => handleCellSave(re.id, "suggestedWeight", v)}
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">RPE sug.</p>
                                <InlineCell
                                  value={re.suggestedRpe}
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  placeholder="—"
                                  onSave={(v) => handleCellSave(re.id, "suggestedRpe", v)}
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Descanso</p>
                                <InlineCell
                                  value={re.restSeconds}
                                  type="number"
                                  min={0}
                                  onSave={(v) => handleCellSave(re.id, "restSeconds", v)}
                                />
                              </div>
                            </div>

                            {isOwn && (
                              <div className="flex justify-end border-t border-border pt-2">
                                {isConfirming ? (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 gap-1 text-xs text-green-600"
                                      onClick={() => handleDelete(re.id)}
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                      Quitar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setConfirmingDeleteId(null)}
                                      disabled={isDeleting}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                                    onClick={() => setConfirmingDeleteId(re.id)}
                                  >
                                    <X className="w-3 h-3" />
                                    Quitar
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto -mx-4 px-4 pb-1 md:block">
                      <table className="w-full text-sm" style={{ minWidth: "680px" }}>
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">#</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Ejercicio</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Grupo muscular</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Series</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Reps</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Peso sug.</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">RPE sug.</th>
                            <th className="px-2 py-2 text-left font-medium text-muted-foreground">Descanso</th>
                            <th className="px-2 py-2" />
                            {isOwn && <th className="px-2 py-2" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {dayExercises.map((re) => {
                            const isConfirming = confirmingDeleteId === re.id;
                            const isDeleting = deletingId === re.id;
                            return (
                              <tr key={re.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-2 py-2 text-muted-foreground">{re.order}</td>
                                <td className="px-2 py-2 font-medium">
                                  <span className="block max-w-52 truncate">{re.exercise.name}</span>
                                </td>
                                <td className="px-2 py-2 text-muted-foreground truncate">
                                  <span className="block max-w-40 truncate">
                                    {re.exercise.muscleGroup?.name ?? "—"}
                                  </span>
                                </td>
                                <td className="px-2 py-2">
                                  <InlineCell
                                    value={re.sets}
                                    type="number"
                                    min={1}
                                    onSave={(v) => handleCellSave(re.id, "sets", v)}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <InlineCell
                                    value={re.reps}
                                    onSave={(v) => handleCellSave(re.id, "reps", v)}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <InlineCell
                                    value={re.suggestedWeight}
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    placeholder="—"
                                    onSave={(v) => handleCellSave(re.id, "suggestedWeight", v)}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <InlineCell
                                    value={re.suggestedRpe}
                                    type="number"
                                    min={1}
                                    max={10}
                                    step={0.5}
                                    placeholder="—"
                                    onSave={(v) => handleCellSave(re.id, "suggestedRpe", v)}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <InlineCell
                                    value={re.restSeconds}
                                    type="number"
                                    min={0}
                                    onSave={(v) => handleCellSave(re.id, "restSeconds", v)}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    onClick={() => setTutorialExercise({
                                      name: re.exercise.name,
                                      muscleGroup: re.exercise.muscleGroup?.name ?? null,
                                      mediaUrl: re.exercise.mediaUrl,
                                      mediaType: re.exercise.mediaType,
                                      description: re.exercise.description,
                                    })}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    title="Ver tutorial"
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                  </button>
                                </td>
                                {isOwn && (
                                  <td className="px-2 py-2">
                                    {isConfirming ? (
                                      <div className="flex gap-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                          onClick={() => handleDelete(re.id)}
                                          disabled={isDeleting}
                                        >
                                          {isDeleting
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Check className="w-3 h-3" />}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 text-muted-foreground"
                                          onClick={() => setConfirmingDeleteId(null)}
                                          disabled={isDeleting}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setConfirmingDeleteId(re.id)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    </>
                  )}

                  {/* Add exercise button */}
                  {isOwn && resolvedDay && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setAddExerciseOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar ejercicio
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ClipboardList className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Sin rutina asignada</p>
                  <Button size="sm" className="gap-2" onClick={() => setAssignOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    Asignar rutina
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab: Historial */}
            <TabsContent value="history" className="p-4 space-y-3">
              {loadingHistory ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted rounded-md" />
                  ))}
                </div>
              ) : workoutHistory.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Sin entrenamientos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workoutHistory.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const exerciseMap = log.sets.reduce<
                      Record<string, { name: string; sets: WorkoutSet[] }>
                    >((acc, set) => {
                      const key = set.exercise.id;
                      if (!acc[key]) acc[key] = { name: set.exercise.name, sets: [] };
                      acc[key].sets.push(set);
                      return acc;
                    }, {});

                    return (
                      <div key={log.id} className="rounded-md border border-border overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <div>
                            <p className="text-sm font-medium">{formatDate(log.date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.sets.length} set{log.sets.length !== 1 ? "s" : ""} registrado{log.sets.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/10">
                            {log.notes && (
                              <p className="text-xs text-muted-foreground italic">{log.notes}</p>
                            )}
                            {Object.values(exerciseMap).map(({ name, sets }) => (
                              <div key={name}>
                                <p className="text-xs font-medium mb-1.5">{name}</p>
                                <div className="space-y-1">
                                  {sets.map((s) => (
                                    <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      <span className="w-12 text-right text-foreground font-medium">Set {s.setNumber}</span>
                                      <span>{s.reps} reps</span>
                                      {s.weight && <span>{s.weight} kg</span>}
                                      {s.rpe && <span>RPE {s.rpe}</span>}
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
              )}
            </TabsContent>
            {/* Tab: Plan semanal */}
            <TabsContent value="weekly-plan" className="p-4">
              <WeeklyPlanTabContent studentId={studentId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};
