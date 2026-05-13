import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AnimatedExercise = ({ mediaUrl }: { mediaUrl: string }) => {
  const [frame, setFrame] = useState(0);
  const frame1Url = mediaUrl.replace("/0.jpg", "/1.jpg");

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, [mediaUrl]);

  return (
    <img
      src={frame === 0 ? mediaUrl : frame1Url}
      alt="Ejercicio"
      className="w-full rounded-lg"
    />
  );
};

export type TutorialExercise = {
  name: string;
  muscleGroup: string | null;
  mediaUrl: string | null;
  mediaType: "GIF" | "YOUTUBE" | null;
  description: string | null;
};

type Props = {
  exercise: TutorialExercise | null;
  open: boolean;
  onClose: () => void;
};

export const ExerciseTutorialDialog = ({ exercise, open, onClose }: Props) => {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
          {exercise.muscleGroup && (
            <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {exercise.mediaUrl && exercise.mediaType === "GIF" && (
            <AnimatedExercise mediaUrl={exercise.mediaUrl} />
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
              <p className="text-sm text-muted-foreground">Sin tutorial disponible</p>
            </div>
          )}

          {exercise.description && (
            <p className="text-sm text-muted-foreground">{exercise.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
