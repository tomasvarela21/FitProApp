import { apiClient } from "./client";
import type {
  ApiSuccess,
  StudentProfile,
  StudentSubscription,
  StudentWorkoutRoutine,
  StudentWorkoutLog,
  WorkoutLogInput,
  WorkoutProgress,
} from "@/types";

type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export const studentPortalApi = {
  getProfile: () =>
    apiClient.get<ApiSuccess<StudentProfile>>("/student/profile"),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<ApiSuccess<StudentProfile>>("/student/profile", payload),

  getSubscription: () =>
    apiClient.get<ApiSuccess<StudentSubscription | null>>(
      "/student/subscription"
    ),

  getRoutine: () =>
    apiClient.get<ApiSuccess<StudentWorkoutRoutine | null>>("/student/routine"),

  getTodayWorkout: () =>
    apiClient.get<ApiSuccess<StudentWorkoutRoutine | null>>("/student/today"),

  logWorkout: (data: WorkoutLogInput) =>
    apiClient.post<ApiSuccess<{ id: string }>>("/student/workout-log", data),

  getWorkoutHistory: () =>
    apiClient.get<ApiSuccess<StudentWorkoutLog[]>>("/student/workout-history"),

  getProgress: (exerciseId: string) =>
    apiClient.get<ApiSuccess<WorkoutProgress[]>>(
      `/student/progress/${exerciseId}`
    ),
};
