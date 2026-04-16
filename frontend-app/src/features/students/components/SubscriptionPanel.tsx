import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useStudentSubscription } from "@/features/students/hooks/use-student-subscription";
import { usePlans } from "@/features/students/hooks/use-plans";
import type { Plan, Installment } from "@/types";

const DURATION_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

const FREQUENCY_LABELS: Record<string, string> = {
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

const assignSchema = z.object({
  planId: z.string().min(1, "Seleccioná un plan"),
  startDate: z.string().min(1, "Seleccioná una fecha"),
  totalAmount: z.number().positive("El monto debe ser mayor a 0"),
  installmentCount: z.number().int().min(1).max(24),
  frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
});

const paySchema = z.object({
  notes: z.string().optional(),
});

type AssignForm = z.infer<typeof assignSchema>;
type PayForm = z.infer<typeof paySchema>;

type SubscriptionPanelProps = {
  studentId: string;
};

const formatDate = (date: string) =>
  format(new Date(date), "dd/MM/yyyy", { locale: es });

const InstallmentStatusBadge = ({ status }: { status: string }) => {
  if (status === "PAID")
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
        <CheckCircle2 className="w-3 h-3" /> Pagada
      </Badge>
    );
  if (status === "OVERDUE")
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-xs">
        <XCircle className="w-3 h-3" /> Vencida
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
      <Clock className="w-3 h-3" /> Pendiente
    </Badge>
  );
};

export const SubscriptionPanel = ({ studentId }: SubscriptionPanelProps) => {
  const {
    subscription,
    isLoadingSubscription,
    createSubscription,
    payInstallment,
    cancelSubscription,
    isCreating,
    isPayingInstallment,
    isCancelling,
  } = useStudentSubscription(studentId);

  const { plans } = usePlans();
  const activePlans = plans.filter((p: Plan) => p.isActive);

  const [assignOpen, setAssignOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignForm = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0],
      installmentCount: 1,
      frequency: "MONTHLY",
    },
  });

  const payForm = useForm<PayForm>({
    resolver: zodResolver(paySchema),
  });

  const selectedPlanId = assignForm.watch("planId");
  const selectedPlan = activePlans.find((p: Plan) => p.id === selectedPlanId);

  const handleAssign = async (data: AssignForm) => {
    setError(null);
    try {
      await createSubscription({
        studentId,
        planId: data.planId,
        startDate: new Date(data.startDate).toISOString(),
        totalAmount: data.totalAmount,
        installmentCount: data.installmentCount,
        frequency: data.frequency,
      });
      setAssignOpen(false);
      assignForm.reset();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al asignar plan"
      );
    }
  };

  const handlePay = async (data: PayForm) => {
    if (!payingInstallment) return;
    setError(null);
    try {
      await payInstallment({
        installmentId: payingInstallment.id,
        notes: data.notes,
      });
      setPayingInstallment(null);
      payForm.reset();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al registrar pago"
      );
    }
  };

  if (isLoadingSubscription) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Plan y pagos
            </CardTitle>
            <div className="flex gap-2">
              {!subscription && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setAssignOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Asignar plan
                </Button>
              )}
              {subscription && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setCancelOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancelar plan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{subscription.planName}</p>
                    <p className="text-xs text-muted-foreground">
                      {DURATION_LABELS[subscription.planDuration]} —{" "}
                      {subscription.installmentCount} cuota{subscription.installmentCount > 1 ? "s" : ""}{" "}
                      {FREQUENCY_LABELS[subscription.frequency].toLowerCase()}s
                    </p>
                  </div>
                  {subscription.daysUntilExpiry < 0 ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                      <XCircle className="w-3 h-3" /> Vencido
                    </Badge>
                  ) : subscription.daysUntilExpiry <= 7 ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                      <AlertTriangle className="w-3 h-3" /> {subscription.daysUntilExpiry}d
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Vigente
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Montos */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold">
                      ${subscription.totalAmount.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagado</p>
                    <p className="text-sm font-bold text-emerald-600">
                      ${subscription.paidAmount.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="text-sm font-bold text-amber-600">
                      ${subscription.pendingAmount.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cuotas */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Cuotas
                </p>
                <div className="space-y-2">
                  {subscription.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {installment.number}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            ${installment.amount.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {installment.status === "PAID" && installment.paidAt
                              ? `Pagada el ${formatDate(installment.paidAt)}`
                              : `Vence ${formatDate(installment.dueDate)}`}
                          </p>
                          {installment.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              {installment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <InstallmentStatusBadge status={installment.status} />
                        {installment.status !== "PAID" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setPayingInstallment(installment);
                              payForm.reset();
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Este alumno no tiene un plan asignado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Asignar Plan */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar plan</DialogTitle>
            <DialogDescription>
              Configurá el plan y las cuotas para este alumno
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={assignForm.handleSubmit(handleAssign)}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select
                onValueChange={(val) => {
                  assignForm.setValue("planId", val);
                  const plan = activePlans.find((p: Plan) => p.id === val);
                  if (plan) assignForm.setValue("totalAmount", plan.price);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan: Plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.price.toLocaleString("es-AR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignForm.formState.errors.planId && (
                <p className="text-xs text-destructive">
                  {assignForm.formState.errors.planId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Monto total ($)</Label>
              <Input
                type="number"
                placeholder={selectedPlan?.price.toString() ?? "0"}
                {...assignForm.register("totalAmount", { valueAsNumber: true })}
              />
              {assignForm.formState.errors.totalAmount && (
                <p className="text-xs text-destructive">
                  {assignForm.formState.errors.totalAmount.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cantidad de cuotas</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  {...assignForm.register("installmentCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Select
                  defaultValue="MONTHLY"
                  onValueChange={(val) =>
                    assignForm.setValue("frequency", val as "BIWEEKLY" | "MONTHLY")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                    <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview de cuotas */}
            {assignForm.watch("totalAmount") > 0 &&
              assignForm.watch("installmentCount") > 0 && (
                <div className="rounded-md bg-muted/40 border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {assignForm.watch("installmentCount")} cuota
                    {assignForm.watch("installmentCount") > 1 ? "s" : ""} de{" "}
                    <strong>
                      $
                      {(
                        assignForm.watch("totalAmount") /
                        assignForm.watch("installmentCount")
                      ).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    </strong>{" "}
                    {FREQUENCY_LABELS[
                      assignForm.watch("frequency")
                    ]?.toLowerCase()}
                    es
                  </p>
                </div>
              )}

            <div className="space-y-1.5">
              <Label>Fecha de inicio</Label>
              <Input type="date" {...assignForm.register("startDate")} />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAssignOpen(false);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Asignar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Pago */}
      <Dialog
        open={!!payingInstallment}
        onOpenChange={() => {
          setPayingInstallment(null);
          setError(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Cuota {payingInstallment?.number} —{" "}
              <strong>
                ${payingInstallment?.amount.toLocaleString("es-AR")}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={payForm.handleSubmit(handlePay)}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>
                Notas{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                placeholder="Ej: Pago en efectivo"
                {...payForm.register("notes")}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPayingInstallment(null);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPayingInstallment}
              >
                {isPayingInstallment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar pago"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cancelar Plan */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cancelar plan?</DialogTitle>
            <DialogDescription>
              Se cancelará el plan <strong>{subscription?.planName}</strong> y todas
              las cuotas pendientes. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCancelOpen(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isCancelling}
              onClick={async () => {
                if (!subscription) return;
                try {
                  await cancelSubscription(subscription.id);
                  setCancelOpen(false);
                } catch {
                  setCancelOpen(false);
                }
              }}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sí, cancelar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
