import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Mail, Phone, Dumbbell, Calendar, TrendingUp, Clock,
  KeyRound, Send, Trash2, Save, Loader2, Pencil, X,
} from "lucide-react";
import { studentsApi } from "@/api/students.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RoutinePanel } from "@/features/students/components/RoutinePanel";
import { SubscriptionPanel } from "@/features/students/components/SubscriptionPanel";
import { NotesInjuriesPanel } from "@/features/students/components/NotesInjuriesPanel";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Student } from "@/types";

// ─── Sessions Chart ───────────────────────────────────────────────────────────

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

// ─── Calendar Heatmap ─────────────────────────────────────────────────────────

const HEATMAP_DAYS = 91; // 13 weeks

function buildHeatmapGrid(sessionsByDay: Record<string, number>) {
  const today = new Date();
  // Start from the Monday of the week 13 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (HEATMAP_DAYS - 1));
  // Align to Monday
  const dayOfWeek = startDate.getDay(); // 0=Sun, 1=Mon...
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - offset);

  const weeks: { date: Date; count: number; isFuture: boolean }[][] = [];
  let current = new Date(startDate);

  while (current <= today || weeks.length < 13) {
    const week: { date: Date; count: number; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = current.toISOString().split("T")[0];
      week.push({ date: new Date(current), count: sessionsByDay[key] ?? 0, isFuture: current > today });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 13) break;
  }
  return weeks;
}

const INTENSITY: Record<number, string> = {
  0: "bg-muted/40",
  1: "bg-primary/30",
  2: "bg-primary/60",
  3: "bg-primary",
};

const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DAY_LABELS = ["L","M","X","J","V","S","D"];

const CalendarHeatmap = ({ data }: { data: Record<string, number> }) => {
  const weeks = buildHeatmapGrid(data);

  // Month labels: find where each new month starts
  const monthLabels: { colIndex: number; label: string }[] = [];
  weeks.forEach((week, colIndex) => {
    const firstDay = week[0].date;
    if (colIndex === 0 || firstDay.getDate() <= 7) {
      const label = MONTH_SHORT[firstDay.getMonth()];
      if (monthLabels.length === 0 || monthLabels[monthLabels.length - 1].label !== label) {
        monthLabels.push({ colIndex, label });
      }
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-2 min-w-0">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pt-5">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[9px] text-muted-foreground leading-none h-[11px] flex items-center">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks grid with month labels */}
        <div className="flex flex-col gap-0">
          {/* Month row */}
          <div className="flex gap-[3px] mb-1 h-4">
            {weeks.map((week, ci) => {
              const ml = monthLabels.find((m) => m.colIndex === ci);
              return (
                <div key={ci} className="w-[11px]">
                  {ml && <span className="text-[9px] text-muted-foreground leading-none">{ml.label}</span>}
                </div>
              );
            })}
          </div>

          {/* Days */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const intensity = day.isFuture ? 0 : Math.min(day.count, 3);
                  const cls = day.isFuture ? "bg-transparent" : INTENSITY[intensity];
                  return (
                    <div
                      key={di}
                      className={`w-[11px] h-[11px] rounded-[2px] ${cls} transition-opacity`}
                      title={`${day.date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}: ${day.count} sesión(es)`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-muted-foreground">Menos</span>
        {[0, 1, 2, 3].map((v) => (
          <div key={v} className={`w-[11px] h-[11px] rounded-[2px] ${INTENSITY[v]}`} />
        ))}
        <span className="text-[10px] text-muted-foreground">Más</span>
      </div>
    </div>
  );
};

// ─── Edit Form ────────────────────────────────────────────────────────────────

const editSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "INACTIVE", "INVITED"]),
});

type EditForm = z.infer<typeof editSchema>;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  INACTIVE: "Inactivo",
  INVITED: "Invitado",
};

type InfoTabProps = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: Student["status"];
    invitedAt: string | null;
    activatedAt: string | null;
    createdAt: string;
  };
  onUpdated: () => void;
};

const InfoTab = ({ student, onUpdated }: InfoTabProps) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone ?? "",
      status: student.status,
    },
  });

  const startEdit = () => {
    reset({
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone ?? "",
      status: student.status,
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); };

  const onSubmit = async (data: EditForm) => {
    setSaving(true);
    try {
      await studentsApi.update(student.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        status: data.status,
      });
      setEditing(false);
      onUpdated();
      setActionMsg({ text: "Datos actualizados", ok: true });
    } catch {
      setActionMsg({ text: "Error al actualizar", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleResetPassword = async () => {
    setResettingPwd(true);
    try {
      await studentsApi.resetPassword(student.id);
      setActionMsg({ text: "Email de reset enviado", ok: true });
    } catch {
      setActionMsg({ text: "Error al enviar reset", ok: false });
    } finally {
      setResettingPwd(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleResendInvitation = async () => {
    setResendingInvite(true);
    try {
      await studentsApi.resendInvitation(student.id);
      setActionMsg({ text: "Invitación reenviada", ok: true });
    } catch {
      setActionMsg({ text: "Error al reenviar invitación", ok: false });
    } finally {
      setResendingInvite(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studentsApi.delete(student.id);
      navigate("/app/students");
    } catch {
      setDeleteOpen(false);
      setActionMsg({ text: "Error al eliminar alumno", ok: false });
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar alumno?</DialogTitle>
            <DialogDescription>
              Se eliminará a <strong>{student.firstName} {student.lastName}</strong> y todos sus datos permanentemente. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        {/* Feedback message */}
        {actionMsg && (
          <div className={`rounded-md px-3 py-2 text-xs ${actionMsg.ok ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
            {actionMsg.text}
          </div>
        )}

        {/* Edit form */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Información personal</CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input id="phone" {...register("phone")} placeholder="+54 11..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    {...register("status")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" className="gap-1.5" disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium">{student.firstName} {student.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{student.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Teléfono</span>
                  <span className="font-medium">{student.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Estado</span>
                  <StatusBadge status={student.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ingresó</span>
                  <span className="font-medium">{student.activatedAt ? format(new Date(student.activatedAt), "d MMM yyyy", { locale: es }) : "—"}</span>
                </div>
                {student.invitedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invitado</span>
                    <span className="font-medium">{format(new Date(student.invitedAt), "d MMM yyyy", { locale: es })}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
                onClick={handleResetPassword}
                disabled={resettingPwd}
              >
                {resettingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Resetear contraseña
              </Button>
              {student.status === "INVITED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={handleResendInvitation}
                  disabled={resendingInvite}
                >
                  {resendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Reenviar invitación
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar alumno
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const TrainerStudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("progreso");
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(["progreso"]));

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMountedTabs((prev) => new Set([...prev, tab]));
  };

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

  const { student, subscription, workoutHistory, totalSessionsCount, sessionsByMonth, sessionsByDay, strengthProgressPct, monthsActive } = summary;

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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
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

          {/* Plan summary (sidebar) */}
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
                    <span>{subscription.totalAmount > 0 ? Math.round((subscription.paidAmount / subscription.totalAmount) * 100) : 0}%</span>
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
        </div>

        {/* Right panel with tabs */}
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList variant="line" className="w-full rounded-none border-b border-border h-auto p-0 justify-start overflow-x-auto mb-6">
              <TabsTrigger value="progreso" className="py-2.5">Progreso</TabsTrigger>
              <TabsTrigger value="metricas" className="py-2.5">Métricas</TabsTrigger>
              <TabsTrigger value="rutina" className="py-2.5">Rutina</TabsTrigger>
              <TabsTrigger value="plan" className="py-2.5">Plan / Pagos</TabsTrigger>
              <TabsTrigger value="notas" className="py-2.5">Notas / Lesiones</TabsTrigger>
              <TabsTrigger value="info" className="py-2.5">Info / Editar</TabsTrigger>
            </TabsList>

            {/* Tab: Progreso */}
            <TabsContent value="progreso" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Sesiones — últimos 8 meses</CardTitle>
                    <span className="text-xs text-muted-foreground">{totalSessionsCount} totales</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {sessionsByMonth && Object.keys(sessionsByMonth).length > 0
                    ? <SessionsChart data={sessionsByMonth} />
                    : <p className="text-xs text-muted-foreground py-8 text-center">Sin sesiones registradas</p>
                  }
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Últimas sesiones</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                  {workoutHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-6 py-4">Sin sesiones registradas</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {workoutHistory.slice(0, 8).map((log) => {
                        const exerciseNames = [...new Set(log.sets.map((s: { exercise: { name: string } }) => s.exercise.name))];
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
            </TabsContent>

            {/* Tab: Métricas */}
            <TabsContent value="metricas" className="space-y-4 mt-0">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sesiones totales", value: totalSessionsCount, icon: Dumbbell, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Meses activo", value: monthsActive ?? "—", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Progreso fuerza", value: strengthProgressPct != null ? `${strengthProgressPct > 0 ? "+" : ""}${strengthProgressPct}%` : "—", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="pt-4 pb-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${stat.bg} mb-2`}>
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <p className="text-xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Heatmap */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Actividad — últimas 13 semanas</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionsByDay && Object.keys(sessionsByDay).length > 0 ? (
                    <CalendarHeatmap data={sessionsByDay} />
                  ) : (
                    <div className="py-6">
                      <CalendarHeatmap data={{}} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sessions by month chart */}
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Sesiones por mes</CardTitle>
                    <span className="text-xs text-muted-foreground">últimos 8 meses</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {sessionsByMonth && Object.keys(sessionsByMonth).length > 0
                    ? <SessionsChart data={sessionsByMonth} />
                    : <p className="text-xs text-muted-foreground py-8 text-center">Sin sesiones registradas</p>
                  }
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Rutina */}
            <TabsContent value="rutina" className="mt-0">
              {mountedTabs.has("rutina") && id && <RoutinePanel studentId={id} />}
            </TabsContent>

            {/* Tab: Plan / Pagos */}
            <TabsContent value="plan" className="mt-0">
              {mountedTabs.has("plan") && id && <SubscriptionPanel studentId={id} />}
            </TabsContent>

            {/* Tab: Notas / Lesiones */}
            <TabsContent value="notas" className="mt-0">
              {mountedTabs.has("notas") && id && <NotesInjuriesPanel studentId={id} />}
            </TabsContent>

            {/* Tab: Info / Editar */}
            <TabsContent value="info" className="mt-0">
              {mountedTabs.has("info") && id && (
                <InfoTab
                  student={student}
                  onUpdated={() => queryClient.invalidateQueries({ queryKey: ["student-summary", id] })}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
