import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  ClipboardList,
  Plus,
  Globe,
  User,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { routinesApi } from "@/api/routines.api";
import { exercisesApi } from "@/api/exercises.api";
import type { Routine, RoutineExercise } from "@/types";
import { getRoutineDays } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_ORDER = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié",
  THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom",
};

const DAY_OPTIONS = DAY_ORDER.map((d) => ({ value: d, label: DAY_LABELS[d] }));

// ─── Schemas ─────────────────────────────────────────────────────────────────

const routineSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
});

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  dayOfWeek: z.string().min(1, "El día es obligatorio"),
  order: z.number().int().min(1, "El orden es obligatorio"),
  sets: z.number().int().min(1, "Mínimo 1 serie"),
  reps: z.string().min(1, "Las reps son obligatorias"),
  suggestedWeight: z.number().min(0).optional(),
  suggestedRpe: z.number().min(0).max(10).optional(),
  restSeconds: z.number().int().min(0),
  notes: z.string().optional(),
});

type RoutineForm = z.infer<typeof routineSchema>;
type AddExerciseForm = z.infer<typeof addExerciseSchema>;

// ─── InlineCell ───────────────────────────────────────────────────────────────

type InlineCellProps = {
  value: string | number | null | undefined;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  onSave: (val: string) => Promise<void>;
  width?: string;
};

const InlineCell = ({
  value, type = "text", min, max, step, placeholder, disabled, onSave, width = "w-16",
}: InlineCellProps) => {
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
    if (disabled || saving) return;
    setInputVal(value?.toString() ?? "");
    setEditing(true);
  };

  const save = async () => {
    const newVal = inputVal;
    const oldVal = value?.toString() ?? "";
    setEditing(false);
    if (newVal === oldVal) return;
    setSaving(true);
    try {
      await onSave(newVal);
    } catch {
      // query invalidation will restore the original value
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") setEditing(false);
  };

  if (saving) {
    return (
      <span className="flex items-center justify-center w-full py-0.5">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </span>
    );
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
        className={cn(
          "bg-transparent border-0 border-b border-primary outline-none text-sm leading-none py-0.5",
          width
        )}
      />
    );
  }

  const display = value !== null && value !== undefined && value !== "" ? String(value) : null;

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled}
      className={cn(
        "text-left text-sm py-0.5 block",
        !disabled && "cursor-pointer hover:text-primary",
        disabled && "cursor-default",
        width
      )}
    >
      {display ?? (
        <span className="text-muted-foreground text-xs">{placeholder ?? "—"}</span>
      )}
    </button>
  );
};

// ─── InlineSelectCell ────────────────────────────────────────────────────────

type InlineSelectCellProps = {
  value: string | null | undefined;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onSave: (val: string) => Promise<void>;
};

const InlineSelectCell = ({ value, options, disabled, onSave }: InlineSelectCellProps) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVal: string) => {
    if (newVal === (value ?? "") || disabled) return;
    setSaving(true);
    try {
      await onSave(newVal);
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <span className="flex items-center py-0.5">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </span>
    );
  }

  const label = options.find((o) => o.value === value)?.label ?? value ?? "—";

  if (disabled) {
    return <span className="text-sm py-0.5 block">{label}</span>;
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-background border-0 border-b border-transparent hover:border-primary focus:border-primary text-sm py-0.5 outline-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
};

// ─── Routine Form Dialog ──────────────────────────────────────────────────────

type RoutineFormDialogProps = {
  open: boolean;
  onClose: () => void;
  editingRoutine: Routine | null;
};

const RoutineFormDialog = ({ open, onClose, editingRoutine }: RoutineFormDialogProps) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editingRoutine;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoutineForm>({ resolver: zodResolver(routineSchema) });

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      isEditing
        ? { name: editingRoutine.name, description: editingRoutine.description ?? "" }
        : { name: "", description: "" }
    );
  }, [open]);

  const handleClose = () => { reset(); setError(null); onClose(); };

  const onSubmit = async (data: RoutineForm) => {
    setError(null);
    try {
      const payload = { ...data, description: data.description || undefined };
      if (isEditing) {
        await routinesApi.update(editingRoutine.id, payload);
      } else {
        await routinesApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (isEditing ? "Error al actualizar la rutina" : "Error al crear la rutina");
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar rutina" : "Nueva rutina"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modificá los datos de la rutina" : "Completá los datos de la nueva rutina. Los días se asignan al agregar ejercicios."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Nombre</Label>
            <Input id="r-name" placeholder="Ej: Torso A" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-desc">
              Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="r-desc" placeholder="Descripción breve" {...register("description")} />
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
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditing ? "Guardando..." : "Creando..."}</>
              ) : isEditing ? "Guardar cambios" : "Crear rutina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Add Exercise Dialog ──────────────────────────────────────────────────────

type AddExerciseDialogProps = {
  open: boolean;
  onClose: () => void;
  routineId: string;
  nextOrder: number;
  defaultDay?: string;
};

const AddExerciseDialog = ({ open, onClose, routineId, nextOrder, defaultDay }: AddExerciseDialogProps) => {
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
      await routinesApi.addExercise(routineId, {
        ...data,
        suggestedWeight: data.suggestedWeight !== undefined && !isNaN(data.suggestedWeight)
          ? data.suggestedWeight
          : undefined,
        suggestedRpe: data.suggestedRpe !== undefined && !isNaN(data.suggestedRpe)
          ? data.suggestedRpe
          : undefined,
        notes: data.notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
      queryClient.invalidateQueries({ queryKey: ["routines"] });
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
            {errors.dayOfWeek && (
              <p className="text-xs text-destructive">{errors.dayOfWeek.message}</p>
            )}
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
            {errors.exerciseId && (
              <p className="text-xs text-destructive">{errors.exerciseId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ae-order">Orden</Label>
              <Input id="ae-order" type="number" min={1} {...register("order", { valueAsNumber: true })} />
              {errors.order && <p className="text-xs text-destructive">{errors.order.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-sets">Series</Label>
              <Input id="ae-sets" type="number" min={1} {...register("sets", { valueAsNumber: true })} />
              {errors.sets && <p className="text-xs text-destructive">{errors.sets.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-reps">Reps</Label>
              <Input id="ae-reps" placeholder="Ej: 8-10" {...register("reps")} />
              {errors.reps && <p className="text-xs text-destructive">{errors.reps.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ae-weight">Peso (kg) <span className="text-muted-foreground text-xs">(opc.)</span></Label>
              <Input
                id="ae-weight"
                type="number"
                min={0}
                step={0.5}
                placeholder="—"
                {...register("suggestedWeight", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-rpe">RPE <span className="text-muted-foreground text-xs">(1-10)</span></Label>
              <Input
                id="ae-rpe"
                type="number"
                min={0}
                max={10}
                step={0.5}
                placeholder="—"
                {...register("suggestedRpe", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-rest">Descanso (s)</Label>
              <Input id="ae-rest" type="number" min={0} {...register("restSeconds", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ae-notes">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="ae-notes" placeholder="Indicaciones adicionales" {...register("notes")} />
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

// ─── Animated Exercise Image ──────────────────────────────────────────────────

const AnimatedExerciseImage = ({ mediaUrl }: { mediaUrl: string }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 700);
    return () => clearInterval(interval);
  }, [mediaUrl]);
  const src = frame === 0 ? mediaUrl : mediaUrl.replace("/0.jpg", "/1.jpg");
  return <img src={src} alt="ejercicio" className="w-full max-h-64 object-contain rounded-lg bg-muted" />;
};

// ─── Routine Detail Dialog ────────────────────────────────────────────────────

type RoutineDetailDialogProps = {
  routineId: string | null;
  onClose: () => void;
};

const RoutineDetailDialog = ({ routineId, onClose }: RoutineDetailDialogProps) => {
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [editRoutineOpen, setEditRoutineOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tutorialExercise, setTutorialExercise] = useState<RoutineExercise["exercise"] | null>(null);

  const { data: routine, isLoading } = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => routinesApi.getOne(routineId!).then((r) => r.data.data),
    enabled: !!routineId,
  });

  const sortedDays = routine ? getRoutineDays(routine) : [];

  useEffect(() => {
    if (sortedDays.length > 0 && (!activeDay || !sortedDays.includes(activeDay))) {
      setActiveDay(sortedDays[0]);
    }
  }, [sortedDays.length]);

  const isOwn = !!routine;
  const exercises = routine?.routineExercises ?? [];
  const dayExercises = activeDay
    ? exercises.filter((re) => re.dayOfWeek === activeDay)
    : exercises;
  const nextOrder = dayExercises.length + 1;

  const invalidateRoutine = () => {
    queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    queryClient.invalidateQueries({ queryKey: ["routines"] });
  };

  const handleCellSave = async (re: RoutineExercise, field: string, rawVal: string) => {
    if (!routine) return;
    const numericFields = ["order", "sets", "suggestedWeight", "suggestedRpe", "restSeconds"];
    const value = numericFields.includes(field)
      ? rawVal === "" ? null : Number(rawVal)
      : rawVal === "" ? null : rawVal;
    await routinesApi.updateExercise(routine.id, re.id, { [field]: value });
    invalidateRoutine();
  };

  const handleDaySave = async (re: RoutineExercise, newDay: string) => {
    if (!routine) return;
    await routinesApi.updateExercise(routine.id, re.id, { dayOfWeek: newDay });
    invalidateRoutine();
  };

  const handleRemoveExercise = async () => {
    if (!routine || !confirmRemoveId) return;
    setRemoveLoading(true);
    try {
      await routinesApi.removeExercise(routine.id, confirmRemoveId);
      invalidateRoutine();
      setConfirmRemoveId(null);
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleDeleteRoutine = async () => {
    if (!routine) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await routinesApi.delete(routine.id);
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al eliminar la rutina";
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Dialog open={!!routineId} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-5xl max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
          {isLoading || !routine ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex min-w-0 items-center gap-3 flex-wrap pr-8">
                  <DialogTitle className="min-w-0 break-words text-lg">{routine.name}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-xs",
                      routine.isGlobal
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-violet-500/10 text-violet-600 border-violet-500/20"
                    )}
                  >
                    {routine.isGlobal ? (
                      <><Globe className="w-3 h-3" />Global</>
                    ) : (
                      <><User className="w-3 h-3" />Propia</>
                    )}
                  </Badge>
                </div>
                {routine.description && (
                  <DialogDescription className="break-words">{routine.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {routine.isGlobal && (
                  <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                    <p className="text-xs text-blue-600">
                      Rutina global — disponible para todos los entrenadores.
                    </p>
                  </div>
                )}

                {/* Day tabs */}
                {sortedDays.length > 0 && (
                  <div className="flex gap-1 border-b border-border overflow-x-auto">
                    {sortedDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setActiveDay(day)}
                        className={cn(
                          "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                          activeDay === day
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
                {exercises.length === 0 ? (
                  <div className="text-center py-10">
                    <ClipboardList className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin ejercicios en esta rutina</p>
                  </div>
                ) : dayExercises.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground">Sin ejercicios para este día</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {[...dayExercises]
                        .sort((a, b) => a.order - b.order)
                        .map((re) => (
                          <div
                            key={re.id}
                            className="rounded-lg border border-border bg-muted/10 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold break-words flex-1">
                                    {re.exercise.name}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-primary"
                                    onClick={() => setTutorialExercise(re.exercise)}
                                    title="Ver tutorial"
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {isOwn ? (
                                    <InlineSelectCell
                                      value={re.dayOfWeek}
                                      options={DAY_OPTIONS}
                                      disabled={!isOwn}
                                      onSave={(v) => handleDaySave(re, v)}
                                    />
                                  ) : (
                                    <span>{DAY_LABELS[re.dayOfWeek]}</span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                <InlineCell
                                  value={re.order}
                                  type="number"
                                  min={1}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "order", v)}
                                  width="w-10"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Series</p>
                                <InlineCell
                                  value={re.sets}
                                  type="number"
                                  min={1}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "sets", v)}
                                  width="w-full"
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Reps</p>
                                <InlineCell
                                  value={re.reps}
                                  type="text"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "reps", v)}
                                  width="w-full"
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Peso</p>
                                <InlineCell
                                  value={re.suggestedWeight}
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "suggestedWeight", v)}
                                  width="w-full"
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">RPE</p>
                                <InlineCell
                                  value={re.suggestedRpe}
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "suggestedRpe", v)}
                                  width="w-full"
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Descanso</p>
                                <InlineCell
                                  value={re.restSeconds}
                                  type="number"
                                  min={0}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "restSeconds", v)}
                                  width="w-full"
                                />
                              </div>
                              <div>
                                <p className="text-muted-foreground">Notas</p>
                                <InlineCell
                                  value={re.notes}
                                  type="text"
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "notes", v)}
                                  width="w-full"
                                />
                              </div>
                            </div>

                            {isOwn && (
                              <div className="flex justify-end border-t border-border pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => setConfirmRemoveId(re.id)}
                                >
                                  <X className="w-3 h-3" />
                                  Quitar
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto -mx-4 px-4 pb-1 md:block">
                    <table className="w-full text-sm" style={{ minWidth: "760px" }}>
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">Día</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-40">Ejercicio</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-16">Series</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-20">Reps</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">Peso (kg)</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-20">RPE</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">Descanso (s)</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-28">Notas</th>
                          {isOwn && <th className="px-3 py-2.5 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...dayExercises]
                          .sort((a, b) => a.order - b.order)
                          .map((re) => (
                            <tr key={re.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.order}
                                  type="number"
                                  min={1}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "order", v)}
                                  width="w-10"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineSelectCell
                                  value={re.dayOfWeek}
                                  options={DAY_OPTIONS}
                                  disabled={!isOwn}
                                  onSave={(v) => handleDaySave(re, v)}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-sm">
                                <div className="flex items-center gap-1.5 max-w-56">
                                  <span className="truncate flex-1">{re.exercise.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-primary"
                                    onClick={() => setTutorialExercise(re.exercise)}
                                    title="Ver tutorial"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.sets}
                                  type="number"
                                  min={1}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "sets", v)}
                                  width="w-12"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.reps}
                                  type="text"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "reps", v)}
                                  width="w-16"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.suggestedWeight}
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "suggestedWeight", v)}
                                  width="w-16"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.suggestedRpe}
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "suggestedRpe", v)}
                                  width="w-14"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.restSeconds}
                                  type="number"
                                  min={0}
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "restSeconds", v)}
                                  width="w-16"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <InlineCell
                                  value={re.notes}
                                  type="text"
                                  placeholder="—"
                                  disabled={!isOwn}
                                  onSave={(v) => handleCellSave(re, "notes", v)}
                                  width="w-full"
                                />
                              </td>
                              {isOwn && (
                                <td className="px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setConfirmRemoveId(re.id)}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}

                {isOwn && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setAddExerciseOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar ejercicio
                  </Button>
                )}

                {isOwn && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => setEditRoutineOpen(true)}
                      >
                        <Pencil className="w-4 h-4" />
                        Editar rutina
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setConfirmDeleteOpen(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar rutina
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add exercise dialog */}
      {routineId && (
        <AddExerciseDialog
          open={addExerciseOpen}
          onClose={() => setAddExerciseOpen(false)}
          routineId={routineId}
          nextOrder={nextOrder}
          defaultDay={activeDay ?? undefined}
        />
      )}

      {/* Confirm remove exercise */}
      <Dialog open={!!confirmRemoveId} onOpenChange={() => setConfirmRemoveId(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Quitar ejercicio?</DialogTitle>
            <DialogDescription>
              Se quitará este ejercicio de la rutina. La rutina no se eliminará.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmRemoveId(null)} disabled={removeLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleRemoveExercise} disabled={removeLoading}>
              {removeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, quitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit routine nested dialog */}
      {routine && (
        <RoutineFormDialog
          open={editRoutineOpen}
          onClose={() => setEditRoutineOpen(false)}
          editingRoutine={routine}
        />
      )}

      {/* Confirm delete routine */}
      <Dialog open={confirmDeleteOpen} onOpenChange={() => { setConfirmDeleteOpen(false); setDeleteError(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Eliminar rutina?</DialogTitle>
            <DialogDescription>
              Estás por eliminar <strong>{routine?.name}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{deleteError}</p>
            </div>
          )}
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteOpen(false)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteRoutine} disabled={deleteLoading}>
              {deleteLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial dialog */}
      <Dialog open={!!tutorialExercise} onOpenChange={() => setTutorialExercise(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tutorialExercise?.name}</DialogTitle>
            {tutorialExercise?.muscleGroup && (
              <p className="text-sm text-muted-foreground">{tutorialExercise.muscleGroup.name}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {tutorialExercise?.mediaUrl && tutorialExercise.mediaType === "GIF" && (
              <AnimatedExerciseImage mediaUrl={tutorialExercise.mediaUrl} />
            )}
            {tutorialExercise?.mediaUrl && tutorialExercise.mediaType === "YOUTUBE" && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={tutorialExercise.mediaUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title={tutorialExercise.name}
                />
              </div>
            )}
            {!tutorialExercise?.mediaUrl && (
              <div className="w-full h-40 bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin tutorial disponible</p>
              </div>
            )}
            {tutorialExercise?.description && (
              <p className="text-sm text-muted-foreground">{tutorialExercise.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const RoutinesPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRoutineId, setDetailRoutineId] = useState<string | null>(null);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["routines"],
    queryFn: () => routinesApi.list().then((r) => r.data.data),
  });

  return (
    <div>
      <PageHeader
        title="Rutinas"
        description="Gestioná rutinas globales y propias"
        action={
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Nueva rutina
          </Button>
        }
      />

      <RoutineFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        editingRoutine={null}
      />

      <RoutineDetailDialog
        routineId={detailRoutineId}
        onClose={() => setDetailRoutineId(null)}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-5 bg-muted rounded-full w-10" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No hay rutinas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Creá tu primera rutina con el botón de arriba
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map((routine) => {
            const days = getRoutineDays(routine);
            return (
              <Card key={routine.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {routine.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0 gap-1",
                        routine.isGlobal
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-violet-500/10 text-violet-600 border-violet-500/20"
                      )}
                    >
                      {routine.isGlobal ? (
                        <><Globe className="w-3 h-3" />Global</>
                      ) : (
                        <><User className="w-3 h-3" />Propia</>
                      )}
                    </Badge>
                  </div>
                  {routine.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {routine.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">
                    {days.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs px-1.5 py-0">
                        {DAY_SHORT[d]}
                      </Badge>
                    ))}
                    {days.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sin días asignados</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {(routine.routineExercises ?? []).length} ejercicio
                    {(routine.routineExercises ?? []).length !== 1 ? "s" : ""}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto gap-2 w-full"
                    onClick={() => setDetailRoutineId(routine.id)}
                  >
                    Ver rutina
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
