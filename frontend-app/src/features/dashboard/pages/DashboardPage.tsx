import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import type { DashboardStats, ExpiringAlert } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const AVATAR_COLORS = [
  "bg-emerald-500/20 text-emerald-600",
  "bg-violet-500/20 text-violet-600",
  "bg-sky-500/20 text-sky-600",
  "bg-amber-500/20 text-amber-600",
  "bg-rose-500/20 text-rose-600",
  "bg-indigo-500/20 text-indigo-600",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const statCards = (stats: DashboardStats) => [
  {
    label: "Total alumnos",
    value: stats.total,
    valueColor: "text-foreground",
  },
  {
    label: "Activos",
    value: stats.active,
    valueColor: "text-primary",
  },
  {
    label: "Invitados",
    value: stats.invited,
    valueColor: "text-amber-500",
  },
  {
    label: "Pausados",
    value: stats.paused,
    valueColor: "text-blue-500",
  },
  {
    label: "Inactivos",
    value: stats.inactive,
    valueColor: "text-muted-foreground",
  },
];

const StatCardSkeleton = () => (
  <Card>
    <CardContent className="pt-5 pb-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-16" />
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
    className="flex flex-col gap-2 py-3 cursor-pointer hover:bg-muted/30 px-2 rounded-md transition-colors sm:flex-row sm:items-center sm:justify-between"
    onClick={onClick}
  >
    <div className="flex min-w-0 items-center gap-3">
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
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{alert.studentName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {alert.planName} · Cuota {alert.installmentNumber}
        </p>
      </div>
    </div>
    <div className="text-left sm:text-right">
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
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();

  const todayRaw = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const hasAlerts =
    (data?.alerts?.expired?.length ?? 0) > 0 ||
    (data?.alerts?.expiringSoon?.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Panel del Entrenador"
        description={todayLabel}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : data &&
            statCards(data.stats).map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {stat.label}
                  </p>
                  <p className={`text-4xl font-bold tabular-nums ${stat.valueColor}`}>
                    {stat.value}
                  </p>
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
                  <div key={i} className="flex items-center justify-between gap-3 py-3">
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
                    className="flex flex-col gap-2 py-3 cursor-pointer hover:bg-muted/30 px-2 rounded-md transition-colors sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => navigate(`/app/students`)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 ${avatarColor(student.firstName + student.lastName)}`}>
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="sm:shrink-0">
                      <StatusBadge status={student.status} />
                    </div>
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
