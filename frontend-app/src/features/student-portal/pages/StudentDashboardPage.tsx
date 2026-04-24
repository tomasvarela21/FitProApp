import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useStudentSubscription } from "@/features/student-portal/hooks/use-student-subscription";
import { useStudentProfile } from "@/features/student-portal/hooks/use-student-profile";

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

const formatDate = (date: string) =>
  format(new Date(date), "dd 'de' MMMM yyyy", { locale: es });

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

export const StudentDashboardPage = () => {
  const { subscription, isLoading: isLoadingSubscription } = useStudentSubscription();
  const { profile, isLoading: isLoadingProfile } = useStudentProfile();

  const isLoading = isLoadingSubscription || isLoadingProfile;
  const firstName = profile?.firstName ?? "Alumno";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Acá podés ver tu plan y el estado de tus pagos"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan actual */}
          {subscription ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Tu plan actual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{subscription.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          {DURATION_LABELS[subscription.planDuration]} —{" "}
                          {subscription.installmentCount} cuota
                          {subscription.installmentCount > 1 ? "s" : ""}{" "}
                          {FREQUENCY_LABELS[subscription.frequency].toLowerCase()}
                          es
                        </p>
                      </div>
                      {subscription.daysUntilExpiry < 0 ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                          <XCircle className="w-3 h-3" /> Vencido
                        </Badge>
                      ) : subscription.daysUntilExpiry <= 7 ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                          <AlertTriangle className="w-3 h-3" /> Por vencer
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Vigente
                        </Badge>
                      )}
                    </div>

                    <Separator />

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

                    <Separator />

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium">{formatDate(subscription.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vencimiento</p>
                        <p className="font-medium">{formatDate(subscription.endDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Próxima cuota */}
                  {subscription.nextInstallment && (
                    <div className={`rounded-lg border px-4 py-3 ${
                      subscription.nextInstallment.status === "OVERDUE"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Próxima cuota
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Cuota {subscription.nextInstallment.number} —{" "}
                            ${subscription.nextInstallment.amount.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.nextInstallment.status === "OVERDUE"
                              ? "Vencida el "
                              : "Vence el "}
                            {formatDate(subscription.nextInstallment.dueDate)}
                          </p>
                        </div>
                        <InstallmentStatusBadge
                          status={subscription.nextInstallment.status}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historial de cuotas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Historial de cuotas</CardTitle>
                </CardHeader>
                <CardContent>
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
                        <InstallmentStatusBadge status={installment.status} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-center">
                <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No tenés un plan asignado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Consultá con tu entrenador para que te asigne un plan
                </p>
              </CardContent>
            </Card>
          )}

          {/* Datos del trainer */}
          {profile?.trainer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tu entrenador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-base font-bold shrink-0">
                    {profile.trainer.firstName[0]}
                    {profile.trainer.lastName[0]}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {profile.trainer.firstName} {profile.trainer.lastName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {profile.trainer.email}
                    </div>
                    {profile.trainer.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {profile.trainer.phone}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
