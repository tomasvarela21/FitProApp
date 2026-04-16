import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  PauseCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardStats, ExpiringAlert } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

const AlertRow = ({
  alert,
  type,
  onClick,
}: {
  alert: ExpiringAlert;
  type: "expiring" | "expired";
  onClick: () => void;
}) => (
  <div
    className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 px-2 rounded-md transition-colors"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
          type === "expired"
            ? "bg-red-500/10 text-red-600"
            : "bg-amber-500/10 text-amber-600"
        }`}
      >
        {type === "expired" ? (
          <XCircle className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{alert.studentName}</p>
        <p className="text-xs text-muted-foreground">
          {alert.planName} · Cuota {alert.installmentNumber}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p
        className={`text-xs font-medium ${
          type === "expired" ? "text-red-600" : "text-amber-600"
        }`}
      >
        {type === "expired"
          ? `Venció hace ${Math.abs(alert.daysUntilExpiry)} día${Math.abs(alert.daysUntilExpiry) !== 1 ? "s" : ""}`
          : `Vence en ${alert.daysUntilExpiry} día${alert.daysUntilExpiry !== 1 ? "s" : ""}`}
      </p>
      <p className="text-xs text-muted-foreground">
        {format(new Date(alert.endDate), "dd/MM/yyyy", { locale: es })}
      </p>
    </div>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();

  const firstName = user?.profile?.firstName ?? "Entrenador";
  const hasAlerts =
    (data?.alerts?.expired?.length ?? 0) > 0 ||
    (data?.alerts?.expiringSoon?.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Resumen de tu actividad reciente"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : data &&
            statCards(data.stats).map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        {!isLoading && hasAlerts && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas de vencimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vencidos */}
                {data?.alerts?.expired && data.alerts.expired.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                      Vencidos ({data.alerts.expired.length})
                    </p>
                    <div className="space-y-1">
                      {data.alerts.expired.map((alert) => (
                        <AlertRow
                          key={alert.subscriptionId}
                          alert={alert}
                          type="expired"
                          onClick={() =>
                            navigate(`/app/students?highlight=${alert.studentId}`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Por vencer */}
                {data?.alerts?.expiringSoon &&
                  data.alerts.expiringSoon.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">
                        Por vencer en 7 días ({data.alerts.expiringSoon.length})
                      </p>
                      <div className="space-y-1">
                        {data.alerts.expiringSoon.map((alert) => (
                          <AlertRow
                            key={alert.subscriptionId}
                            alert={alert}
                            type="expiring"
                            onClick={() =>
                              navigate(`/app/students?highlight=${alert.studentId}`)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Últimos alumnos */}
        <Card className={!hasAlerts ? "lg:col-span-2" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Últimos alumnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
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
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 px-2 rounded-md transition-colors"
                    onClick={() => navigate(`/app/students`)}
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
    </div>
  );
};
