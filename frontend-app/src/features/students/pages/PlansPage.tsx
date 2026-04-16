import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { usePlans } from "@/features/students/hooks/use-plans";
import type { Plan } from "@/types";

const DURATION_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

const planSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  price: z.number().positive("El precio debe ser mayor a 0"),
  duration: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
});

type PlanForm = z.infer<typeof planSchema>;

export const PlansPage = () => {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = usePlans();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
  });

  const handleCreate = async (data: PlanForm) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createPlan(data);
      setCreateOpen(false);
      form.reset();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al crear el plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      duration: plan.duration,
    });
  };

  const handleUpdate = async (data: PlanForm) => {
    if (!editingPlan) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updatePlan({ id: editingPlan.id, ...data });
      setEditingPlan(null);
      form.reset();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar el plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await updatePlan({ id: plan.id, isActive: !plan.isActive });
    } catch {
      // silencioso
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    setIsDeleting(true);
    try {
      await deletePlan(deletingPlan.id);
      setDeletingPlan(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al eliminar el plan"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const PlanFormContent = ({ onSubmit }: { onSubmit: (data: PlanForm) => void }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input placeholder="Ej: Plan Mensual" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>
          Descripción{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          placeholder="Ej: Acceso completo a todas las rutinas"
          {...form.register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Precio ($)</Label>
          <Input type="number" placeholder="0" {...form.register("price", { valueAsNumber: true })} />
          {form.formState.errors.price && (
            <p className="text-xs text-destructive">
              {form.formState.errors.price.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Duración</Label>
          <Select
            defaultValue={editingPlan?.duration}
            onValueChange={(val) =>
              form.setValue(
                "duration",
                val as PlanForm["duration"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Mensual</SelectItem>
              <SelectItem value="QUARTERLY">Trimestral</SelectItem>
              <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
              <SelectItem value="ANNUAL">Anual</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.duration && (
            <p className="text-xs text-destructive">
              {form.formState.errors.duration.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setCreateOpen(false);
            setEditingPlan(null);
            setError(null);
            form.reset();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : editingPlan ? (
            "Guardar cambios"
          ) : (
            "Crear plan"
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Planes"
        description="Creá y gestioná tus planes de entrenamiento"
        action={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              form.reset({ duration: "MONTHLY" });
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo plan
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium">No tenés planes creados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Creá tu primer plan con el botón de arriba
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: Plan) => (
            <Card
              key={plan.id}
              className={!plan.isActive ? "opacity-60" : ""}
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      plan.isActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                    }
                  >
                    {plan.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold">
                      ${plan.price.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DURATION_LABELS[plan.duration]}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleEdit(plan)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleToggleActive(plan)}
                  >
                    {plan.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-zinc-400" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setDeletingPlan(plan)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo plan</DialogTitle>
            <DialogDescription>
              Completá los datos del plan de entrenamiento
            </DialogDescription>
          </DialogHeader>
          <PlanFormContent onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog
        open={!!editingPlan}
        onOpenChange={() => {
          setEditingPlan(null);
          setError(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
          </DialogHeader>
          <PlanFormContent onSubmit={handleUpdate} />
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog
        open={!!deletingPlan}
        onOpenChange={() => setDeletingPlan(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar plan?</DialogTitle>
            <DialogDescription>
              Estás por eliminar{" "}
              <strong>{deletingPlan?.name}</strong>. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeletingPlan(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
