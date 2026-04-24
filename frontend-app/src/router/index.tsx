import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ActivateAccountPage } from "@/features/auth/pages/ActivateAccountPage";
import { ProfilePage } from "@/features/auth/pages/ProfilePage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { StudentsPage } from "@/features/students/pages/StudentsPage";
import { PlansPage } from "@/features/students/pages/PlansPage";
import { StudentDashboardPage } from "@/features/student-portal/pages/StudentDashboardPage";
import { StudentProfilePage } from "@/features/student-portal/pages/StudentProfilePage";
import { AppLayout } from "@/components/shared/Layout/AppLayout";
import { StudentLayout } from "@/components/shared/StudentLayout/StudentLayout";

type RouteProps = { children: ReactNode };

const PrivateRoute = ({ children }: RouteProps) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

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
          <Route path="plans" element={<PlansPage />} />
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
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
