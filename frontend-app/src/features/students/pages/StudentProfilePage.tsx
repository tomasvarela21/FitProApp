import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Dumbbell, Calendar, TrendingUp, Clock } from "lucide-react";
import { studentsApi } from "@/api/students.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const SessionsChart = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-1.5 h-24">
      {entries.map(([key, count]) => {
        const [, month] = key.split("-");
        const heightPct = Math.max((count / max) * 100, count > 0 ? 8 : 4);
        const isCurrentMonth = key === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        return (
          <div key={key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full flex items-end" style={{ height: "76px" }}>
              <div
                className={`w-full rounded-sm transition-all ${isCurrentMonth ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${heightPct}%` }}
                title={`${count} sesiones`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{MONTH_LABELS[month] ?? month}</span>
          </div>
        );
      })}
    </div>
  );
};

export const TrainerStudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["student-summary", id],
    queryFn: () => studentsApi.getSummary(id!).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { student, subscription, workoutHistory, totalSessionsCount, sessionsByMonth, strengthProgressPct, monthsActive } = summary;

  const statCards = [
    { label: "Sesiones", value: totalSessionsCount ?? 0, icon: Dumbbell, color: "text-primary" },
    { label: "Meses activo", value: monthsActive ?? "—", icon: Calendar, color: "text-blue-400" },
    { label: "Fuerza", value: strengthProgressPct !== null ? `${strengthProgressPct > 0 ? "+" : ""}${strengthProgressPct}%` : "—", icon: TrendingUp, color: "text-primary" },
    { label: "Últ. sesión", value: workoutHistory[0] ? formatDistanceToNow(new Date(workoutHistory[0].date), { locale: es, addSuffix: false }) : "—", icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/app/students")}>
          <ArrowLeft className="w-4 h-4" />
          Alumnos
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{student.firstName} {student.lastName}</span>
        <StatusBadge status={student.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left panel */}
        <div className="flex flex-col gap-4">
          {/* Avatar + info */}
          <Card>
            <CardContent className="pt-6 pb-5 flex flex-col items-center text-center gap-3">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold">
                {student.firstName[0]}{student.lastName[0]}
              </div>
              <div>
                <p className="font-semibold text-lg leading-tight">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3" />{student.email}
                </p>
                {student.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" />{student.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 flex flex-col gap-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <p className="text-xl font-bold font-[family-name:var(--font-heading)]" style={{ fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Plan actual */}
          {subscription && (
            <Card>
              <CardHeader className="pb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Plan actual</p>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-semibold text-sm">{subscription.planName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vence {format(new Date(subscription.endDate), "d MMM yyyy", { locale: es })}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Pagado</span>
                    <span>{subscription.installmentCount > 0 ? Math.round((subscription.paidAmount / subscription.totalAmount) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${subscription.totalAmount > 0 ? Math.round((subscription.paidAmount / subscription.totalAmount) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ingresó</span>
                <span className="font-medium">{student.activatedAt ? format(new Date(student.activatedAt), "d MMM yyyy", { locale: es }) : "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Estado</span>
                <StatusBadge status={student.status} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Sessions chart */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Sesiones — últimos 8 meses</CardTitle>
                <span className="text-xs text-muted-foreground">{totalSessionsCount} sesiones totales</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {sessionsByMonth && Object.keys(sessionsByMonth).length > 0
                ? <SessionsChart data={sessionsByMonth} />
                : <p className="text-xs text-muted-foreground py-8 text-center">Sin sesiones registradas</p>
              }
            </CardContent>
          </Card>

          {/* Recent sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Últimas sesiones</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {workoutHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground px-6 py-4">Sin sesiones registradas</p>
              ) : (
                <div className="divide-y divide-border">
                  {workoutHistory.slice(0, 6).map((log) => {
                    const exerciseNames = [...new Set(log.sets.map((s) => s.exercise.name))];
                    const totalSets = log.sets.length;
                    return (
                      <div key={log.id} className="flex items-center justify-between px-6 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {format(new Date(log.date), "EEE d MMM", { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {exerciseNames.slice(0, 3).join(" · ")}
                            {exerciseNames.length > 3 && ` +${exerciseNames.length - 3}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-muted-foreground">{totalSets} sets</span>
                          <p className="text-xs text-primary font-medium">Completada</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
