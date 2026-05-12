import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, ClipboardList, Plus, RefreshCw,
  ChevronDown, ChevronUp, Check, X,
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
import { getRoutineDays } from "@/types";

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

// ─── Main Component ───────────────────────────────────────────────────────────

export const RoutinePanel = ({ studentId }: Props) => {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    await routinesApi.updateExercise(routineId, routineExerciseId, { [field]: value });
    queryClient.invalidateQueries({ queryKey: ["student-routine", studentId] });
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
            </TabsList>

            {/* Tab: Rutina activa */}
            <TabsContent value="routine" className="p-4 space-y-4">
              {loadingRoutine ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                              <div className="min-w-0">
                                <p className="text-sm font-semibold break-words">
                                  {re.exercise.name}
                                </p>
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
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};
