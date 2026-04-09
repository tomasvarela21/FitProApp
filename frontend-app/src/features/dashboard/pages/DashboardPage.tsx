import {
  Users,
  UserCheck,
  UserX,
  Clock,
  PauseCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardStats } from "@/types";

const statCards = (stats: DashboardStats) => [
  {
    label: "Total alumnos",
    value: stats.total,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Activos",
    value: stats.active,
    icon: UserCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Invitados",
    value: stats.invited,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    label: "Pausados",
    value: stats.paused,
    icon: PauseCircle,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    label: "Inactivos",
    value: stats.inactive,
    icon: UserX,
    color: "text-zinc-500",
    bg: "bg-zinc-500/10",
  },
];

const StatCardSkeleton = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-10" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const RecentStudentSkeleton = () => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-5 w-16 rounded-full" />
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();

  const firstName = user?.profile?.firstName ?? "Entrenador";

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Resumen de tu actividad reciente"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : data &&
            statCards(data.stats).map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bg}`}
                    >
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Students */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Últimos alumnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <RecentStudentSkeleton key={i} />
              ))}
            </div>
          ) : data?.recentStudents.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Todavía no tenés alumnos. ¡Creá el primero!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data?.recentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.email}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={student.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};