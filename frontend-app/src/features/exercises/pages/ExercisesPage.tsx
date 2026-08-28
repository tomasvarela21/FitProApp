import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  MoveVertical,
  Footprints,
  Circle,
  Smile,
  Zap,
  Shield,
  Heart,
  ArrowUp,
  ArrowDown,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { exercisesApi } from "@/api/exercises.api";
import { ExerciseFormDialog } from "@/features/exercises/components/ExerciseFormDialog";

const MUSCLE_GROUP_ICONS: Record<string, LucideIcon> = {
  pecho: Dumbbell,
  espalda: MoveVertical,
  piernas: Footprints,
  hombros: Circle,
  biceps: Smile,
  triceps: Zap,
  core: Shield,
  cardio: Heart,
  gluteos: ArrowUp,
  pantorrillas: ArrowDown,
};

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  pecho: "bg-blue-500/10 text-blue-600",
  espalda: "bg-yellow-500/10 text-yellow-500",
  piernas: "bg-purple-500/10 text-purple-600",
  hombros: "bg-amber-500/10 text-amber-600",
  biceps: "bg-pink-500/10 text-pink-600",
  triceps: "bg-orange-500/10 text-orange-600",
  core: "bg-teal-500/10 text-teal-600",
  cardio: "bg-red-500/10 text-red-600",
  gluteos: "bg-indigo-500/10 text-indigo-600",
  pantorrillas: "bg-cyan-500/10 text-cyan-600",
};

export const ExercisesPage = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: muscleGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["muscle-groups"],
    queryFn: () => exercisesApi.getMuscleGroups().then((r) => r.data.data),
  });

  const { data: allExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => exercisesApi.list().then((r) => r.data.data),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => exercisesApi.getEquipment().then((r) => r.data.data),
  });

  const countByGroupId = useMemo(
    () =>
      allExercises.reduce<Record<string, number>>((acc, ex) => {
        const id = ex.muscleGroup?.id;
        if (id) acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      }, {}),
    [allExercises]
  );

  return (
    <div>
      <PageHeader
        title="Ejercicios"
        description="Explorá los ejercicios por grupo muscular"
        action={
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Nuevo ejercicio
          </Button>
        }
      />

      <ExerciseFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        editingExercise={null}
        muscleGroups={muscleGroups}
        equipment={equipment}
        invalidateKey={["exercises"]}
      />

      {loadingGroups ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {muscleGroups.map((mg) => {
            const Icon = MUSCLE_GROUP_ICONS[mg.slug] ?? Dumbbell;
            const colorClass = MUSCLE_GROUP_COLORS[mg.slug] ?? "bg-muted text-muted-foreground";
            const count = countByGroupId[mg.id] ?? 0;

            return (
              <Card
                key={mg.id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                onClick={() => navigate(`/app/exercises/${mg.slug}`)}
              >
                <CardContent className="p-5 space-y-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{mg.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count} ejercicio{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
