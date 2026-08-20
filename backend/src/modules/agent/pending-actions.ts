import { StudentsService } from "../students/students.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { RoutinesService } from "../routines/routines.service";
import { ExercisesService } from "../exercises/exercises.service";

const ACTION_TTL_MS = 5 * 60 * 1000;

export type PendingAction = {
  type: string;
  payload: Record<string, unknown>;
  resumen: string;
  expiresAt: number;
  // messageId del mensaje de confirmación enviado por el bot (para editarlo)
  messageId?: number;
};

const pending = new Map<string, PendingAction>();

export const pendingActions = {
  set(chatId: string, action: Omit<PendingAction, "expiresAt">) {
    pending.set(chatId, { ...action, expiresAt: Date.now() + ACTION_TTL_MS });
  },

  get(chatId: string): PendingAction | null {
    const action = pending.get(chatId);
    if (!action) return null;
    if (Date.now() > action.expiresAt) {
      pending.delete(chatId);
      return null;
    }
    return action;
  },

  setMessageId(chatId: string, messageId: number) {
    const action = pending.get(chatId);
    if (action) action.messageId = messageId;
  },

  delete(chatId: string) {
    pending.delete(chatId);
  },
};

/**
 * Ejecuta la acción confirmada por el trainer. Devuelve un texto corto con el
 * resultado, para editar el mensaje de confirmación y alimentar el historial.
 */
export async function executePendingAction(
  trainerUserId: string,
  action: PendingAction
): Promise<string> {
  const p = action.payload as Record<string, any>;

  switch (action.type) {
    case "registrar_pago": {
      await SubscriptionsService.payInstallment(trainerUserId, p.installmentId, {
        notes: p.notes,
      });
      return "Pago registrado correctamente.";
    }
    case "crear_alumno": {
      const student = await StudentsService.createStudent(trainerUserId, {
        email: p.email,
        dni: p.dni,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
      });
      return `Alumno creado: ${p.firstName} ${p.lastName}. Se le envió una invitación por email (id: ${(student as any).id ?? "ok"}).`;
    }
    case "crear_suscripcion": {
      await SubscriptionsService.createSubscription(trainerUserId, {
        studentId: p.studentId,
        planId: p.planId,
        startDate: p.startDate,
        totalAmount: p.totalAmount,
        installmentCount: p.installmentCount ?? 1,
        frequency: p.frequency ?? "MONTHLY",
      });
      return "Suscripción creada con sus cuotas.";
    }
    case "asignar_rutina": {
      await RoutinesService.assignRoutineToStudent(
        trainerUserId,
        p.studentId,
        p.routineId,
        p.notes
      );
      return "Rutina asignada al alumno.";
    }
    case "crear_rutina": {
      const routine = await RoutinesService.createRoutine(trainerUserId, {
        name: p.name,
        description: p.description,
      });
      return `Rutina "${p.name}" creada (id: ${(routine as any).id}).`;
    }
    case "agregar_ejercicio_a_rutina": {
      await RoutinesService.addExerciseToRoutine(trainerUserId, p.routineId, {
        exerciseId: p.exerciseId,
        dayOfWeek: p.dayOfWeek,
        order: p.order ?? 1,
        sets: p.sets,
        reps: String(p.reps),
        suggestedWeight: p.suggestedWeight,
        suggestedRpe: p.suggestedRpe,
        restSeconds: p.restSeconds,
        notes: p.notes,
      });
      return "Ejercicio agregado a la rutina.";
    }
    case "crear_ejercicio": {
      const exercise = await ExercisesService.createExercise(trainerUserId, {
        name: p.name,
        description: p.description,
        muscleGroupId: p.muscleGroupId,
        movementType: p.movementType,
        difficulty: p.difficulty ?? "BEGINNER",
        equipmentId: p.equipmentId,
      });
      return `Ejercicio "${p.name}" creado (id: ${(exercise as any).id}).`;
    }
    default:
      throw new Error(`Acción desconocida: ${action.type}`);
  }
}
