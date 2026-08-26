import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, X, Trash2, Send, KeyRound, Dumbbell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { studentsApi } from "@/api/students.api";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { RoutinePanel } from "./RoutinePanel";
import type { Student, StudentStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const editStudentSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  phone: z.string().optional(),
  status: z.enum(["INVITED", "ACTIVE", "PAUSED", "INACTIVE"]),
});

type EditStudentForm = z.infer<typeof editStudentSchema>;

type Props = {
  student: Student | null;
  open: boolean;
  onClose: () => void;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="min-w-0 text-sm font-medium sm:text-right">{value}</span>
  </div>
);

export const StudentDetailSheet = ({ student, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["student-summary", student?.id],
    queryFn: () => studentsApi.getSummary(student!.id).then((r) => r.data.data),
    enabled: open && !!student,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!summary || !student) return;
    if (summary.subscription !== undefined) {
      queryClient.setQueryData(["subscription", student.id], summary.subscription);
    }
    if (summary.studentRoutine !== undefined) {
      queryClient.setQueryData(["student-routine", student.id], summary.studentRoutine);
    }
  }, [summary, student?.id]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditStudentForm>({
    resolver: zodResolver(editStudentSchema),
  });

  const handleEdit = () => {
    if (!student) return;
    reset({
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone ?? "",
      status: student.status,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleClose = () => {
    setIsEditing(false);
    setIsDeleting(false);
    setResendSuccess(false);
    setResetSuccess(false);
    setError(null);
    onClose();
  };

  const onSubmit = async (data: EditStudentForm) => {
    if (!student) return;
    setError(null);
    try {
      await studentsApi.update(student.id, data);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsEditing(false);
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al actualizar el alumno";
      setError(message);
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    setIsDeleteLoading(true);
    try {
      await studentsApi.delete(student.id);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al eliminar el alumno";
      setError(message);
      setIsDeleting(false);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!student) return;
    setIsResending(true);
    setError(null);
    try {
      await studentsApi.resendInvitation(student.id);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al reenviar la invitación";
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!student) return;
    setIsResettingPassword(true);
    setError(null);
    try {
      await studentsApi.resetPassword(student.id);
      setResetSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al resetear la contraseña";
      setError(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!student) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Detail / Edit Dialog */}
      <Dialog open={open && !isDeleting} onOpenChange={handleClose}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar alumno" : "Detalle del alumno"}
            </DialogTitle>
          </DialogHeader>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Teléfono{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+54 9 11 1234-5678"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  defaultValue={student.status}
                  onValueChange={(val) =>
                    setValue("status", val as StudentStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INVITED">Invitado</SelectItem>
                    <SelectItem value="PAUSED">Pausado</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-2 min-w-0 space-y-4">
              {/* Avatar + nombre */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-bold shrink-0">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {student.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="divide-y divide-border">
                <DetailRow
                  label="Estado"
                  value={<StatusBadge status={student.status} />}
                />
                <DetailRow label="Teléfono" value={student.phone ?? "—"} />
                <DetailRow
                  label="Invitado"
                  value={formatDate(student.invitedAt)}
                />
                <DetailRow
                  label="Activó cuenta"
                  value={formatDate(student.activatedAt)}
                />
                <DetailRow
                  label="Creado"
                  value={formatDate(student.createdAt)}
                />
                <DetailRow
                  label="Sesiones completadas"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-primary" />
                      {student.sessionsCount}
                    </span>
                  }
                />
                {student.lastSessionDate && (
                  <DetailRow
                    label="Última sesión"
                    value={formatDistanceToNow(new Date(student.lastSessionDate), { locale: es, addSuffix: true })}
                  />
                )}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {resendSuccess && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-xs text-emerald-600">
                    ✓ Invitación reenviada correctamente
                  </p>
                </div>
              )}

              {resetSuccess && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-xs text-emerald-600">
                    ✓ Email de reset enviado correctamente
                  </p>
                </div>
              )}

              {/* Reenviar invitación — solo INVITED */}
              {student.status === "INVITED" && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleResendInvitation}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Reenviar invitación
                    </>
                  )}
                </Button>
              )}

              {/* Reset contraseña — solo ACTIVE */}
              {student.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Resetear contraseña
                    </>
                  )}
                </Button>
              )}

              {/* Panel de suscripción */}
              <SubscriptionPanel studentId={student.id} />

              {/* Panel de rutinas */}
              <RoutinePanel studentId={student.id} />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleEdit}
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setIsDeleting(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={isDeleting} onOpenChange={() => setIsDeleting(false)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Eliminar alumno?</DialogTitle>
            <DialogDescription>
              Estás por eliminar a{" "}
              <strong>
                {student.firstName} {student.lastName}
              </strong>
              . Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleting(false)}
              disabled={isDeleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isDeleteLoading}
            >
              {isDeleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};