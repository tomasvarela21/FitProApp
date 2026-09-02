import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Pencil,
  Trash2,
  Send,
  KeyRound,
  Loader2,
  CalendarDays,
  Dumbbell,
} from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import { studentsApi } from "@/api/students.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { SubscriptionPanel } from "@/features/students/components/SubscriptionPanel";
import { RoutinePanel } from "@/features/students/components/RoutinePanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { StudentStatus } from "@/types";

const AVATAR_COLORS = [
  "bg-yellow-500/20 text-yellow-500",
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

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const editSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  status: z.enum(["INVITED", "ACTIVE", "PAUSED", "INACTIVE"]),
});
type EditForm = z.infer<typeof editSchema>;

export const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResettingPwd, setIsResettingPwd] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["student-summary", id],
    queryFn: () => studentsApi.getSummary(id!).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) return null;

  const { student, workoutHistory, subscription } = summary;

  // Derived stats
  const sessionCount = workoutHistory.length;
  const monthsActive = student.activatedAt
    ? Math.max(1, differenceInMonths(new Date(), new Date(student.activatedAt)))
    : null;

  // Sessions per month for chart (last 8 months)
  const now = new Date();
  const chartMonths = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    return { label: MONTH_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() };
  });
  const sessionsByMonth = chartMonths.map((m) => ({
    ...m,
    count: workoutHistory.filter((w) => {
      const d = new Date(w.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length,
  }));
  const maxSessions = Math.max(...sessionsByMonth.map((m) => m.count), 1);

  const recentSessions = [...workoutHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleEdit = () => {
    reset({
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone ?? "",
      status: student.status,
    });
    setEditOpen(true);
  };

  const onSubmit = async (data: EditForm) => {
    try {
      await studentsApi.update(student.id, data);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-summary", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setEditOpen(false);
    } catch {
      setActionMsg({ type: "err", text: "Error al guardar" });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await studentsApi.delete(student.id);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      navigate("/app/students");
    } catch {
      setActionMsg({ type: "err", text: "Error al eliminar" });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await studentsApi.resendInvitation(student.id);
      setActionMsg({ type: "ok", text: "Invitación reenviada" });
    } catch {
      setActionMsg({ type: "err", text: "Error al reenviar" });
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPwd = async () => {
    setIsResettingPwd(true);
    try {
      await studentsApi.resetPassword(student.id);
      setActionMsg({ type: "ok", text: "Email de reset enviado" });
    } catch {
      setActionMsg({ type: "err", text: "Error al resetear" });
    } finally {
      setIsResettingPwd(false);
    }
  };

  const color = avatarColor(student.firstName + student.lastName);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/app/students" className="hover:text-foreground transition-colors">
          Alumnos
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">
          {student.firstName} {student.lastName}
        </span>
        <StatusBadge status={student.status} />
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-bold shrink-0 ${color}`}>
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{student.email}</p>
            {student.phone && (
              <p className="text-muted-foreground text-sm">{student.phone}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {student.status === "INVITED" && (
            <Button variant="outline" size="sm" onClick={handleResend} disabled={isResending} className="gap-2">
              {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Reenviar invitación
            </Button>
          )}
          {student.status === "ACTIVE" && (
            <Button variant="outline" size="sm" onClick={handleResetPwd} disabled={isResettingPwd} className="gap-2">
              {isResettingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Resetear contraseña
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </Button>
        </div>
      </div>

      {actionMsg && (
        <div className={`mb-4 rounded-md px-3 py-2 text-xs ${actionMsg.type === "ok" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Sesiones</p>
            <p className="text-4xl font-bold tabular-nums">{sessionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Meses activo</p>
            <p className="text-4xl font-bold tabular-nums text-primary">{monthsActive ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Plan actual</p>
            <p className="text-sm font-semibold mt-1 truncate">{subscription?.planName ?? <span className="text-muted-foreground font-normal text-xs">Sin plan</span>}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Estado</p>
            <div className="mt-2"><StatusBadge status={student.status} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: subscription + routine */}
        <div className="lg:col-span-2 space-y-6">
          <SubscriptionPanel studentId={student.id} />
          <RoutinePanel studentId={student.id} />
        </div>

        {/* Right: tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="historial">
            <TabsList className="mb-4">
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="progreso">Progreso</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            {/* Historial */}
            <TabsContent value="historial">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Sesiones — últimos 8 meses</CardTitle>
                    <span className="text-xs text-muted-foreground">{sessionCount} sesiones totales</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bar chart */}
                  <div className="flex items-end gap-2 h-28 mb-6">
                    {sessionsByMonth.map((m, i) => {
                      const heightPct = maxSessions > 0 ? (m.count / maxSessions) * 100 : 0;
                      const isLast = i === sessionsByMonth.length - 1;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center" style={{ height: "88px" }}>
                            <div
                              className={`w-full rounded-t-sm transition-all ${isLast ? "bg-primary" : "bg-primary/25"}`}
                              style={{ height: `${Math.max(heightPct, m.count > 0 ? 8 : 2)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="mb-4" />

                  {/* Recent sessions */}
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Últimas sesiones</p>
                  {recentSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Dumbbell className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sin sesiones registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentSessions.map((s) => {
                        const exerciseNames = [...new Set(s.sets.map((set) => set.exercise.name))].slice(0, 2);
                        return (
                          <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {exerciseNames.length > 0 ? exerciseNames.join(", ") : "Sesión"}
                                {exerciseNames.length < [...new Set(s.sets.map((set) => set.exercise.name))].length && "…"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {s.sets.length} series
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                              {format(new Date(s.date), "d MMM", { locale: es })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progreso */}
            <TabsContent value="progreso">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Métricas de progreso</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Próximamente: peso, fuerza máxima y métricas corporales
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Info */}
            <TabsContent value="info">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-0 divide-y divide-border">
                    {[
                      { label: "Email", value: student.email },
                      { label: "Teléfono", value: student.phone ?? "—" },
                      { label: "Estado", value: <StatusBadge status={student.status} /> },
                      { label: "Invitado", value: student.invitedAt ? format(new Date(student.invitedAt), "d 'de' MMMM yyyy", { locale: es }) : "—" },
                      { label: "Activó cuenta", value: student.activatedAt ? format(new Date(student.activatedAt), "d 'de' MMMM yyyy", { locale: es }) : "—" },
                      { label: "Alta", value: format(new Date(student.createdAt), "d 'de' MMMM yyyy", { locale: es }) },
                    ].map((row) => (
                      <div key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-medium sm:text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar alumno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Apellido</Label>
                <Input {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input placeholder="+54 9 11..." {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select defaultValue={student.status} onValueChange={(v) => setValue("status", v as StudentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INVITED">Invitado</SelectItem>
                  <SelectItem value="PAUSED">Pausado</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Eliminar alumno?</DialogTitle>
            <DialogDescription>
              Estás por eliminar a <strong>{student.firstName} {student.lastName}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
