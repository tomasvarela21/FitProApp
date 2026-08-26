export type UserRole = "TRAINER" | "STUDENT";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
};

export type TrainerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  createdAt: string;
};

export type StudentStatus = "INVITED" | "ACTIVE" | "PAUSED" | "INACTIVE";

export type StudentSubscriptionSummary = {
  id: string;
  planName: string;
  endDate: string;
  subscriptionStatus: "ACTIVE" | "EXPIRING_SOON" | "OVERDUE" | "PAID";
};

export type Student = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: StudentStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: StudentSubscriptionSummary | null;
  sessionsCount: number;
  lastSessionDate: string | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardStats = {
  total: number;
  active: number;
  invited: number;
  paused: number;
  inactive: number;
  retentionRate: number;
  activePercentage: number;
  weeklySessionsCount: number;
  weeklySessionsDelta: number;
  newStudentsThisMonth: number;
};

export type DashboardRecentStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: StudentStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
};

export type ExpiringAlert = {
  subscriptionId: string;
  installmentId: string;
  studentId: string;
  studentName: string;
  planName: string;
  installmentNumber: number;
  endDate: string;
  daysUntilExpiry: number;
};

export type DashboardSummary = {
  stats: DashboardStats;
  recentStudents: DashboardRecentStudent[];
  alerts: {
    expiringSoon: ExpiringAlert[];
    expired: ExpiringAlert[];
  };
};

export type ApiSuccess<T> = {
  ok: true;
  message: string;
  data: T;
};

export type ApiError = {
  ok: false;
  message: string;
  errors?: unknown;
};

export type PlanDuration = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: PlanDuration;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type InstallmentStatus = "PENDING" | "PAID" | "OVERDUE";
export type PaymentFrequency = "BIWEEKLY" | "MONTHLY";

export type Installment = {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: InstallmentStatus;
  notes: string | null;
};

export type Subscription = {
  id: string;
  studentId: string;
  studentName: string;
  planId: string;
  planName: string;
  planDuration: PlanDuration;
  frequency: PaymentFrequency;
  totalAmount: number;
  installmentCount: number;
  paidAmount: number;
  pendingAmount: number;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  createdAt: string;
  installments: Installment[];
};

export type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  periodLabel: string;
  notes: string | null;
  createdAt: string;
};

export type StudentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  activatedAt: string | null;
  trainer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

export type StudentSubscription = {
  id: string;
  planName: string;
  planDuration: PlanDuration;
  frequency: PaymentFrequency;
  totalAmount: number;
  installmentCount: number;
  paidAmount: number;
  pendingAmount: number;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  nextInstallment: {
    id: string;
    number: number;
    amount: number;
    dueDate: string;
    status: InstallmentStatus;
  } | null;
  installments: Installment[];
};

export type MuscleGroup = { id: string; name: string; slug: string };
export type Equipment = { id: string; name: string };

export type Exercise = {
  id: string;
  name: string;
  description: string | null;
  muscleGroup: MuscleGroup;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  movementType: "PUSH" | "PULL" | "HINGE" | "SQUAT" | "CARRY" | "CORE" | "CARDIO" | "OLYMPIC";
  equipment: Equipment | null;
  mediaUrl: string | null;
  mediaType: "GIF" | "YOUTUBE" | null;
  isGlobal: boolean;
  trainerId: string | null;
  createdAt: string;
};

export type RoutineExercise = {
  id: string;
  dayOfWeek: string;
  order: number;
  sets: number;
  reps: string;
  suggestedWeight: number | null;
  suggestedRpe: number | null;
  restSeconds: number;
  notes: string | null;
  exercise: Exercise;
};

export type Routine = {
  id: string;
  name: string;
  description: string | null;
  isGlobal: boolean;
  trainerId: string | null;
  routineExercises: RoutineExercise[];
  createdAt: string;
};

export const getRoutineDays = (routine: Routine): string[] => {
  const days = new Set(routine.routineExercises.map((re) => re.dayOfWeek));
  const order = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return order.filter((d) => days.has(d));
};

export type StudentRoutine = {
  id: string;
  studentId: string;
  routineId: string;
  isActive: boolean;
  assignedAt: string;
  notes: string | null;
  routine: Routine;
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
  notes: string | null;
};

export type WorkoutLog = {
  id: string;
  date: string;
  notes: string | null;
  workoutSets: WorkoutSet[];
  studentRoutine: { routine: { name: string } };
};

export type StudentRoutineExercise = {
  id: string;
  dayOfWeek: string;
  order: number;
  sets: number;
  reps: string;
  suggestedWeight: number | null;
  suggestedRpe: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
    mediaUrl: string | null;
    mediaType: "GIF" | "YOUTUBE" | null;
    muscleGroup: { id: string; name: string; slug: string } | null;
    equipment: { id: string; name: string } | null;
  };
};

export type StudentWorkoutRoutine = {
  studentRoutineId: string;
  assignedAt: string;
  notes: string | null;
  routine: {
    id: string;
    name: string;
    description: string | null;
    daysOfWeek: string[];
    routineExercises: StudentRoutineExercise[];
  };
};

export type StudentWorkoutLog = {
  id: string;
  date: string;
  notes: string | null;
  createdAt: string;
  sets: {
    id: string;
    setNumber: number;
    reps: number;
    weight: number | null;
    rpe: number | null;
    notes: string | null;
    exercise: {
      id: string;
      name: string;
      order: number;
      muscleGroup: { name: string } | null;
    };
  }[];
};

export type WorkoutLogInput = {
  date?: string;
  notes?: string;
  routineExercises: {
    routineExerciseId: string;
    sets: {
      setNumber: number;
      reps: number;
      weight?: number | null;
      rpe?: number | null;
      notes?: string;
    }[];
  }[];
};

export type WorkoutProgress = {
  date: string;
  maxWeight: number | null;
  avgRpe: number | null;
  totalSets: number;
};

export type WeeklyExerciseOverride = {
  id: string;
  routineExerciseId: string;
  weekNumber: number;
  suggestedWeight: number | null;
  suggestedReps: string | null;
  suggestedRpe: number | null;
  notes: string | null;
};

export type StudentSummary = {
  totalSessionsCount: number;
  sessionsByMonth: Record<string, number>;
  strengthProgressPct: number | null;
  monthsActive: number | null;
  student: Student;
  subscription: StudentSubscription | null;
  studentRoutine: {
    id: string;
    assignedAt: string;
    notes: string | null;
    weekNumber: number;
    startDate: string | null;
    endDate: string | null;
    routine: Routine;
  } | null;
  workoutHistory: {
    id: string;
    date: string;
    notes: string | null;
    createdAt: string;
    sets: {
      id: string;
      setNumber: number;
      reps: number;
      weight: number | null;
      rpe: number | null;
      notes: string | null;
      exercise: { id: string; name: string; order: number };
    }[];
  }[];
  weeklyPlan: {
    studentRoutineId: string;
    weekNumber: number;
    startDate: string | null;
    endDate: string | null;
    weeks: {
      weekNumber: number;
      overrides: WeeklyExerciseOverride[];
    }[];
  } | null;
};

export type WeeklyPlan = {
  studentRoutine: {
    id: string;
    weekNumber: number;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    routine: Routine;
  };
  weeks: {
    weekNumber: number;
    startDate: string | null;
    endDate: string | null;
    overrides: WeeklyExerciseOverride[];
  }[];
};