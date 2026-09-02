import { useState, useMemo, useEffect } from "react";
import { Search, Dumbbell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { exercisesApi } from "@/api/exercises.api";
import type { Exercise } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ExerciseCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <CardContent className="pt-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-8 w-full mt-2" />
    </CardContent>
  </Card>
);

// ─── Animated Image ───────────────────────────────────────────────────────────

const AnimatedExerciseImage = ({ mediaUrl }: { mediaUrl: string }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 700);
    return () => clearInterval(interval);
  }, [mediaUrl]);
  const src = frame === 0 ? mediaUrl : mediaUrl.replace("/0.jpg", "/1.jpg");
  return (
    <div className="w-full h-64 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
      <img src={src} alt="ejercicio" className="w-full h-full object-contain" />
    </div>
  );
};

// ─── Detail Dialog ────────────────────────────────────────────────────────────

const ExerciseDetailDialog = ({
  exercise,
  open,
  onClose,
}: {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {exercise.mediaUrl && exercise.mediaType === "GIF" && (
            <AnimatedExerciseImage mediaUrl={exercise.mediaUrl} />
          )}

          {exercise.mediaUrl && exercise.mediaType === "YOUTUBE" && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={exercise.mediaUrl}
                className="w-full h-full"
                allowFullScreen
                title={exercise.name}
              />
            </div>
          )}

          {!exercise.mediaUrl && (
            <div className="w-full h-40 bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
              <Dumbbell className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin video disponible</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {exercise.muscleGroup && (
              <Badge variant="outline" className="text-xs">
                {exercise.muscleGroup.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${DIFFICULTY_COLORS[exercise.difficulty] ?? ""}`}
            >
              {DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty}
            </Badge>
            {exercise.equipment && (
              <Badge variant="outline" className="text-xs">
                {exercise.equipment.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {MOVEMENT_LABELS[exercise.movementType] ?? exercise.movementType}
            </Badge>
          </div>

          {exercise.description && (
            <p className="text-sm text-muted-foreground">{exercise.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Exercise Card ────────────────────────────────────────────────────────────

const ExerciseCard = ({
  exercise,
  onDetail,
}: {
  exercise: Exercise;
  onDetail: (ex: Exercise) => void;
}) => (
  <Card className="overflow-hidden flex flex-col">
    {exercise.mediaUrl ? (
      <div className="w-full h-48 overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
        <img
          src={exercise.mediaUrl}
          alt={exercise.name}
          className="w-full h-full object-cover"
        />
      </div>
    ) : (
      <div className="h-48 w-full bg-muted flex items-center justify-center">
        <Dumbbell className="w-10 h-10 text-muted-foreground/30" />
      </div>
    )}

    <CardContent className="pt-3 space-y-2 flex flex-col flex-1">
      <p className="font-semibold text-sm leading-tight">{exercise.name}</p>

      <div className="flex flex-wrap gap-1">
        {exercise.muscleGroup && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {exercise.muscleGroup.name}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={`text-xs px-1.5 py-0 ${DIFFICULTY_COLORS[exercise.difficulty] ?? ""}`}
        >
          {DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty}
        </Badge>
        {exercise.equipment && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {exercise.equipment.name}
          </Badge>
        )}
      </div>

      {exercise.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {exercise.description}
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-auto"
        onClick={() => onDetail(exercise)}
      >
        Ver detalles
      </Button>
    </CardContent>
  </Card>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const StudentExercisesPage = () => {
  const [search, setSearch] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  const { data: exercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ["exercises-all"],
    queryFn: () => exercisesApi.list().then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  const { data: muscleGroups = [] } = useQuery({
    queryKey: ["muscle-groups"],
    queryFn: () => exercisesApi.getMuscleGroups().then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  });

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (muscleGroupId !== "all" && ex.muscleGroup?.id !== muscleGroupId) return false;
      if (difficulty !== "all" && ex.difficulty !== difficulty) return false;
      return true;
    });
  }, [exercises, search, muscleGroupId, difficulty]);

  return (
    <div className="w-full max-w-3xl">
      <PageHeader
        title="Ejercicios"
        description="Explorá la biblioteca de ejercicios"
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={muscleGroupId} onValueChange={setMuscleGroupId}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Grupo muscular" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {muscleGroups.map((mg) => (
              <SelectItem key={mg.id} value={mg.id}>
                {mg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Dificultad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="BEGINNER">Principiante</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermedio</SelectItem>
            <SelectItem value="ADVANCED">Avanzado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loadingExercises ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExerciseCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Sin resultados</p>
          <p className="text-sm text-muted-foreground mt-1">
            Probá con otros filtros de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onDetail={setDetailExercise} />
          ))}
        </div>
      )}

      <ExerciseDetailDialog
        exercise={detailExercise}
        open={!!detailExercise}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  );
};
