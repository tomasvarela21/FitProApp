import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exercisesApi } from "@/api/exercises.api";
import type { Exercise, MuscleGroup, Equipment } from "@/types";

const exerciseSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  muscleGroupId: z.string().min(1, "El grupo muscular es obligatorio"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  movementType: z.enum(["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "CORE", "CARDIO", "OLYMPIC"]),
  equipmentId: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["GIF", "YOUTUBE"]).optional(),
});

type ExerciseForm = z.infer<typeof exerciseSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  editingExercise: Exercise | null;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  defaultMuscleGroupId?: string;
  invalidateKey?: unknown[];
};

export const ExerciseFormDialog = ({
  open,
  onClose,
  editingExercise,
  muscleGroups,
  equipment,
  defaultMuscleGroupId,
  invalidateKey = ["exercises"],
}: Props) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editingExercise;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseForm>({ resolver: zodResolver(exerciseSchema) });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (isEditing) {
      reset({
        name: editingExercise.name,
        description: editingExercise.description ?? "",
        muscleGroupId: editingExercise.muscleGroup.id,
        difficulty: editingExercise.difficulty,
        movementType: editingExercise.movementType,
        equipmentId: editingExercise.equipment?.id ?? "",
        mediaUrl: editingExercise.mediaUrl ?? "",
        mediaType: editingExercise.mediaType ?? undefined,
      });
    } else {
      reset({
        name: "",
        description: "",
        muscleGroupId: defaultMuscleGroupId ?? "",
        difficulty: undefined,
        movementType: undefined,
        equipmentId: "",
        mediaUrl: "",
        mediaType: undefined,
      });
    }
  }, [open]);

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = async (data: ExerciseForm) => {
    setError(null);
    try {
      const payload = {
        ...data,
        description: data.description || undefined,
        equipmentId: data.equipmentId || undefined,
        mediaUrl: data.mediaUrl || undefined,
        mediaType: data.mediaType || undefined,
      };
      if (isEditing) {
        await exercisesApi.update(editingExercise.id, payload);
      } else {
        await exercisesApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (isEditing ? "Error al actualizar el ejercicio" : "Error al crear el ejercicio");
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del ejercicio"
              : "Completá los datos para crear un nuevo ejercicio"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">Nombre</Label>
            <Input id="ex-name" placeholder="Ej: Press de banca" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-desc">
              Descripción{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="ex-desc" placeholder="Descripción breve" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Grupo muscular</Label>
              <Controller
                name="muscleGroupId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map((mg) => (
                        <SelectItem key={mg.id} value={mg.id}>
                          {mg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.muscleGroupId && (
                <p className="text-xs text-destructive">{errors.muscleGroupId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Equipamiento{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Controller
                name="equipmentId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin equipamiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin equipamiento</SelectItem>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dificultad</Label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Principiante</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermedio</SelectItem>
                      <SelectItem value="ADVANCED">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.difficulty && (
                <p className="text-xs text-destructive">{errors.difficulty.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de movimiento</Label>
              <Controller
                name="movementType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUSH">Empuje</SelectItem>
                      <SelectItem value="PULL">Jalón</SelectItem>
                      <SelectItem value="HINGE">Bisagra</SelectItem>
                      <SelectItem value="SQUAT">Sentadilla</SelectItem>
                      <SelectItem value="CARRY">Cargada</SelectItem>
                      <SelectItem value="CORE">Core</SelectItem>
                      <SelectItem value="CARDIO">Cardio</SelectItem>
                      <SelectItem value="OLYMPIC">Olímpico</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.movementType && (
                <p className="text-xs text-destructive">{errors.movementType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ex-mediaUrl">
                URL de media{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input id="ex-mediaUrl" placeholder="https://..." {...register("mediaUrl")} />
            </div>

            <div className="space-y-1.5">
              <Label>
                Tipo de media{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Controller
                name="mediaType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin media</SelectItem>
                      <SelectItem value="GIF">GIF</SelectItem>
                      <SelectItem value="YOUTUBE">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-3 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Guardando..." : "Creando..."}
                </>
              ) : isEditing ? (
                "Guardar cambios"
              ) : (
                "Crear ejercicio"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
