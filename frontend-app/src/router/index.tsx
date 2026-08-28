import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/api/auth.api";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { VerifyEmailPage } from "@/features/auth/pages/VerifyEmailPage";
import { ActivateAccountPage } from "@/features/auth/pages/ActivateAccountPage";
import { ProfilePage } from "@/features/auth/pages/ProfilePage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { StudentsPage } from "@/features/students/pages/StudentsPage";
import { TrainerStudentProfilePage } from "@/features/students/pages/StudentProfilePage";
import { PlansPage } from "@/features/students/pages/PlansPage";
import { ExercisesPage } from "@/features/exercises/pages/ExercisesPage";
import { ExerciseGroupPage } from "@/features/exercises/pages/ExerciseGroupPage";
import { RoutinesPage } from "@/features/routines/pages/RoutinesPage";
import { PaymentsPage } from "@/features/payments/pages/PaymentsPage";
import { ChatPage } from "@/features/chat/pages/ChatPage";
import { AnalyticsPage } from "@/features/analytics/pages/AnalyticsPage";
import { StudentDashboardPage } from "@/features/student-portal/pages/StudentDashboardPage";
import { StudentProfilePage } from "@/features/student-portal/pages/StudentProfilePage";
import { StudentProgressPage } from "@/features/student-portal/pages/StudentProgressPage";
import { StudentExercisesPage } from "@/features/student-portal/pages/StudentExercisesPage";
import { AppLayout } from "@/components/shared/Layout/AppLayout";
import { StudentLayout } from "@/components/shared/StudentLayout/StudentLayout";

// Intenta renovar el access token desde la cookie HttpOnly al cargar la app.
// Si no hay cookie válida, limpia el estado de auth.
const AuthInitializer = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  const { setToken, setInitialized, logout } = useAuthStore.getState();

  useEffect(() => {
    if (isInitialized) return;

    if (!isAuthenticated) {
      setInitialized();
      return;
    }

    authApi
      .refresh()
      .then((res) => {
        setToken(res.data.data.accessToken);
      })
      .catch(() => {
        // Cookie expirada o revocada — limpiar estado persistido
        logout();
      })
      .finally(() => {
        setInitialized();
      });
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

type RouteProps = { children: ReactNode };

const PublicRoute = ({ children }: RouteProps) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  return user?.role === "STUDENT"
    ? <Navigate to="/student/dashboard" replace />
    : <Navigate to="/app/dashboard" replace />;
};

const TrainerRoute = ({ children }: RouteProps) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "TRAINER") return <Navigate to="/student/dashboard" replace />;
  return <>{children}</>;
};

const StudentRoute = ({ children }: RouteProps) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "STUDENT") return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route path="/activate-account" element={<ActivateAccountPage />} />

          {/* Trainer routes */}
          <Route
            path="/app"
            element={
              <TrainerRoute>
                <AppLayout />
              </TrainerRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<TrainerStudentProfilePage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/:slug" element={<ExerciseGroupPage />} />
            <Route path="routines" element={<RoutinesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Student routes */}
          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentLayout />
              </StudentRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="exercises" element={<StudentExercisesPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="progress" element={<StudentProgressPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
};
