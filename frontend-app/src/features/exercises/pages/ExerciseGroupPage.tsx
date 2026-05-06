import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Search,
  Globe,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { exercisesApi } from "@/api/exercises.api";
import { ExerciseFormDialog } from "@/features/exercises/components/ExerciseFormDialog";
import type { Exercise } from "@/types";

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  INTERMEDIATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ADVANCED: "bg-red-500/10 text-red-600 border-red-500/20",
};

const MOVEMENT_LABELS: Record<string, string> = {
  PUSH: "Empuje",
  PULL: "Jalón",
  HINGE: "Bisagra",
  SQUAT: "Sentadilla",
  CARRY: "Cargada",
  CORE: "Core",
  CARDIO: "Cardio",
  OLYMPIC: "Olímpico",
};

type DeleteDialogProps = {
  exercise: Exercise | null;
  onClose: () => void;
  slug: string;
};

const DeleteExerciseDialog = ({ exercise, onClose, slug }: DeleteDialogProps) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!exercise) return;
    setIsLoading(true);
    setError(null);
    try {
      await exercisesApi.delete(exercise.id);
      queryClient.invalidateQueries({ queryKey: ["exercises", slug] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al eliminar el ejercicio";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!exercise} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Eliminar ejercicio?</DialogTitle>
          <DialogDescription>
            Estás por eliminar <strong>{exercise?.name}</strong>. Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Sí, eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ExerciseGroupPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  const { data: muscleGroups = [] } = useQuery({
    queryKey: ["muscle-groups"],
    queryFn: () => exercisesApi.getMuscleGroups().then((r) => r.data.data),
  });

  const muscleGroup = muscleGroups.find((mg) => mg.slug === slug);

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => exercisesApi.getEquipment().then((r) => r.data.data),
  });

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["exercises", slug],
    queryFn: () =>
      exercisesApi
        .list({ muscleGroupId: muscleGroup?.id })
        .then((r) => r.data.data),
    enabled: !!muscleGroup,
  });

  const filtered = exercises.filter((ex) => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (difficultyFilter !== "all" && ex.difficulty !== difficultyFilter) return false;
    if (onlyMine && ex.isGlobal) return false;
    return true;
  });

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const invalidateKey = ["exercises", slug];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground -ml-2 mt-0.5"
            onClick={() => navigate("/app/exercises")}
          >
            <ArrowLeft className="w-4 h-4" />
            Ejercicios
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {muscleGroup?.name ?? slug}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""} en este grupo
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo ejercicio
        </Button>
      </div>

      <ExerciseFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        editingExercise={null}
        muscleGroups={muscleGroups}
        equipment={equipment}
        defaultMuscleGroupId={muscleGroup?.id}
        invalidateKey={invalidateKey}
      />
      <ExerciseFormDialog
        open={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        editingExercise={editingExercise}
        muscleGroups={muscleGroups}
        equipment={equipment}
        defaultMuscleGroupId={muscleGroup?.id}
        invalidateKey={invalidateKey}
      />
      <DeleteExerciseDialog
        exercise={deletingExercise}
        onClose={() => setDeletingExercise(null)}
        slug={slug ?? ""}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ejercicio..."
              className="pl-9 w-52"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
            >
              Limpiar
            </Button>
          )}
        </form>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Dificultad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="BEGINNER">Principiante</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermedio</SelectItem>
            <SelectItem value="ADVANCED">Avanzado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={onlyMine ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyMine(!onlyMine)}
          className="gap-2"
        >
          <User className="w-4 h-4" />
          Solo míos
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded-full w-20" />
                  <div className="h-5 bg-muted rounded-full w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium">No hay ejercicios</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || difficultyFilter !== "all" || onlyMine
              ? "Probá con otros filtros"
              : "Creá el primer ejercicio de este grupo"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exercise) => (
            <Card key={exercise.id} className="flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                {/* Thumbnail GIF */}
                {exercise.mediaUrl && exercise.mediaType === "GIF" && (
                  <img
                    src={exercise.mediaUrl}
                    alt={exercise.name}
                    className="w-full h-32 object-cover rounded-md bg-muted"
                  />
                )}

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight">{exercise.name}</h3>
                  <Badge
                    variant="outline"
                    className={
                      exercise.isGlobal
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs shrink-0 gap-1"
                        : "bg-violet-500/10 text-violet-600 border-violet-500/20 text-xs shrink-0 gap-1"
                    }
                  >
                    {exercise.isGlobal ? (
                      <>
                        <Globe className="w-3 h-3" />
                        Global
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        Propio
                      </>
                    )}
                  </Badge>
                </div>

                {exercise.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {exercise.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <Badge
                    variant="outline"
                    className={`text-xs ${DIFFICULTY_COLORS[exercise.difficulty]}`}
                  >
                    {DIFFICULTY_LABELS[exercise.difficulty]}
                  </Badge>
                  {exercise.equipment && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.equipment.name}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {MOVEMENT_LABELS[exercise.movementType]}
                </p>

                {!exercise.isGlobal && (
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 gap-1.5 text-xs"
                      onClick={() => setEditingExercise(exercise)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingExercise(exercise)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
