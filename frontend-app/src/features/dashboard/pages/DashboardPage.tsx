import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  Clock,
  Zap,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Plus,
  FileText,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardStats, ExpiringAlert } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const statCards = (stats: DashboardStats) => [
  {
    label: "Total alumnos",
    value: stats.total,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    gradient: false,
    sub: stats.newStudentsThisMonth > 0 ? `+${stats.newStudentsThisMonth} este mes` : null,
    subColor: "text-primary",
  },
  {
    label: "Activos",
    value: stats.active,
    icon: UserCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    gradient: false,
    sub: stats.total > 0 ? `${stats.activePercentage}% del total` : null,
    subColor: "text-muted-foreground",
  },
  {
    label: "Sesiones/semana",
    value: stats.weeklySessionsCount,
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    gradient: false,
    sub: stats.weeklySessionsDelta !== 0
      ? `${stats.weeklySessionsDelta > 0 ? "+" : ""}${stats.weeklySessionsDelta} vs anterior`
      : "igual que semana anterior",
    subColor: stats.weeklySessionsDelta >= 0 ? "text-primary" : "text-red-400",
  },
  {
    label: "Invitados",
    value: stats.invited,
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    gradient: false,
    sub: stats.invited > 0 ? "Pendientes de acceso" : "Sin pendientes",
    subColor: "text-amber-400",
  },
  {
    label: "Retención",
    value: stats.total > 0 ? `${stats.retentionRate}%` : "—",
    icon: TrendingUp,
    color: "text-white",
    bg: "",
    gradient: true,
    sub: "Últimos 30 días",
    subColor: "text-white/70",
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
    className="flex flex-col gap-2 py-3 cursor-pointer hover:bg-muted/30 px-2 rounded-md transition-colors sm:flex-row sm:items-center sm:justify-between"
    onClick={onClick}
  >
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
          type === "expired"
            ? "bg-red-500/10 text-red-400"
            : "bg-amber-500/10 text-amber-400"
        }`}
      >
        {type === "expired" ? (
          <XCircle className="w-3.5 h-3.5" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate">{alert.studentName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {alert.planName} · Cuota {alert.installmentNumber}
        </p>
      </div>
    </div>
    <p
      className={`text-xs font-medium shrink-0 ${
        type === "expired" ? "text-red-400" : "text-amber-400"
      }`}
    >
      {type === "expired"
        ? `Hace ${Math.abs(alert.daysUntilExpiry)}d`
        : `En ${alert.daysUntilExpiry}d`}
    </p>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();

  const firstName = user?.profile?.firstName ?? "Entrenador";
  const hasExpired = (data?.alerts?.expired?.length ?? 0) > 0;
  const hasExpiring = (data?.alerts?.expiringSoon?.length ?? 0) > 0;
  const hasAlerts = hasExpired || hasExpiring;

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Resumen de tu actividad reciente"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : data &&
            statCards(data.stats).map((stat) =>
              stat.gradient ? (
                <div
                  key={stat.label}
                  className="rounded-xl p-4"
                  style={{ background: "linear-gradient(135deg, #00C896 0%, #00A37A 100%)", boxShadow: "0 4px 12px rgba(0,200,150,0.25)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20 shrink-0">
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white/70 font-medium uppercase tracking-wide">{stat.label}</p>
                      <p className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                    </div>
                  </div>
                  {stat.sub && <p className="text-xs text-white/60 mt-2">{stat.sub}</p>}
                </div>
              ) : (
                <Card key={stat.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${stat.bg}`}>
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                        <p className="text-2xl font-bold font-[family-name:var(--font-heading)]" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                      </div>
                    </div>
                    {stat.sub && <p className={`text-xs mt-2 ${stat.subColor}`}>{stat.sub}</p>}
                  </CardContent>
                </Card>
              )
            )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Últimos alumnos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Alumnos recientes
            </CardTitle>
            <Button
              variant="link"
              size="sm"
              className="text-primary text-xs h-auto p-0"
              onClick={() => navigate("/app/students")}
            >
              Ver todos →
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {isLoading ? (
              <div className="divide-y divide-border px-6">
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
              <div className="py-8 text-center px-6">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés alumnos. ¡Creá el primero!
                </p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_90px] gap-2 px-6 py-2 bg-muted/30 border-y border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alumno</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registrado</span>
                </div>
                <div className="divide-y divide-border">
                  {data?.recentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="grid grid-cols-[1fr_80px_90px] gap-2 items-center px-6 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => navigate(`/app/students/${student.id}`)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
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
                      <div>
                        <StatusBadge status={student.status} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(student.createdAt), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Panel derecho: siempre visible */}
        <div className="flex flex-col gap-4">

          {/* Alertas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : !hasAlerts ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  Sin alertas activas
                </p>
              ) : (
                <div>
                  {hasExpired && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
                        Vencidos ({data!.alerts.expired.length})
                      </p>
                      {data!.alerts.expired.map((alert) => (
                        <AlertRow
                          key={alert.subscriptionId}
                          alert={alert}
                          type="expired"
                          onClick={() => navigate(`/app/students?highlight=${alert.studentId}`)}
                        />
                      ))}
                    </div>
                  )}
                  {hasExpiring && (
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                        Por vencer ({data!.alerts.expiringSoon.length})
                      </p>
                      {data!.alerts.expiringSoon.map((alert) => (
                        <AlertRow
                          key={alert.subscriptionId}
                          alert={alert}
                          type="expiring"
                          onClick={() => navigate(`/app/students?highlight=${alert.studentId}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex flex-col gap-2">
              <Button
                className="w-full justify-start gap-2 font-semibold"
                onClick={() => navigate("/app/students?new=1")}
              >
                <Plus className="w-4 h-4" />
                Agregar alumno
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/app/plans")}
              >
                <FileText className="w-4 h-4" />
                Crear plan
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/app/routines")}
              >
                <Calendar className="w-4 h-4" />
                Ver rutinas
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
