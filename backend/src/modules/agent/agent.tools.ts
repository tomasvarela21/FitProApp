import { Type, FunctionDeclaration } from "@google/genai";
import { TrainersService } from "../trainers/trainers.service";
import { StudentsService } from "../students/students.service";
import { StudentSummaryService } from "../students/student-summary.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { PlansService } from "../plans/plans.service";
import { RoutinesService } from "../routines/routines.service";
import { ExercisesService } from "../exercises/exercises.service";
import { pendingActions } from "./pending-actions";

export type ToolContext = {
  trainerUserId: string;
  chatId: string;
};

const PENDING_RESULT =
  "PENDIENTE_CONFIRMACION: la acción quedó pendiente. Avisale al entrenador que debe tocar el botón Confirmar en el mensaje que aparecerá debajo. NO afirmes que la acción se ejecutó.";

// Limita listas anidadas para controlar tokens en los resultados de tools.
const MAX_LIST_ITEMS = 20;

const truncateLists = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const sliced = value.slice(0, MAX_LIST_ITEMS).map(truncateLists);
    if (value.length > MAX_LIST_ITEMS) {
      sliced.push(`... (${value.length - MAX_LIST_ITEMS} items más omitidos)`);
    }
    return sliced;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = truncateLists(v);
    return out;
  }
  return value;
};

const serialize = (value: unknown) => JSON.stringify(truncateLists(value));

const resumenProp = {
  resumen: {
    type: Type.STRING,
    description:
      "Descripción completa en español de la acción para mostrar al entrenador antes de confirmar. Incluí nombres, montos y fechas concretos.",
  },
} as const;

export const functionDeclarations: FunctionDeclaration[] = [
  // ── Lecturas ──────────────────────────────────────────────────────────────
  {
    name: "dashboard_resumen",
    description:
      "Resumen general del negocio: cantidad de alumnos por estado, alumnos recientes y alertas de cuotas vencidas o por vencer en 7 días.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "buscar_alumnos",
    description:
      "Busca alumnos por nombre, apellido o email. Usala SIEMPRE antes de operar sobre un alumno mencionado por nombre, para obtener su studentId.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: {
          type: Type.STRING,
          description: "Texto de búsqueda: nombre, apellido o email. Vacío lista todos.",
        },
      },
    },
  },
  {
    name: "detalle_alumno",
    description:
      "Vista completa de un alumno: datos personales, suscripción con cuotas, rutina activa y últimos entrenamientos.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
      },
      required: ["studentId"],
    },
  },
  {
    name: "cuotas_por_vencer",
    description:
      "Lista las cuotas vencidas y las que vencen en los próximos 7 días, de todos los alumnos.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "suscripcion_alumno",
    description:
      "Suscripción vigente de un alumno con el detalle de todas sus cuotas (installments): número, monto, vencimiento, estado e installmentId. Usala para obtener el installmentId antes de registrar un pago.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
      },
      required: ["studentId"],
    },
  },
  {
    name: "listar_planes",
    description: "Lista los planes de precios del entrenador (nombre, precio, duración).",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "listar_rutinas",
    description: "Lista las rutinas disponibles (propias y globales) con su ID y nombre.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "detalle_rutina",
    description: "Detalle de una rutina: ejercicios por día, series, reps y descansos.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        routineId: { type: Type.STRING, description: "ID de la rutina" },
      },
      required: ["routineId"],
    },
  },
  {
    name: "listar_ejercicios",
    description:
      "Busca ejercicios del catálogo (propios y globales). Devuelve id, nombre, grupo muscular y dificultad.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: "Texto de búsqueda por nombre" },
        muscleGroupId: { type: Type.STRING, description: "Filtrar por grupo muscular" },
      },
    },
  },
  {
    name: "catalogos_ejercicio",
    description:
      "Lista los grupos musculares y equipamiento disponibles (con sus IDs). Necesario antes de crear un ejercicio.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "rutina_activa_alumno",
    description: "Rutina actualmente asignada a un alumno.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
      },
      required: ["studentId"],
    },
  },
  {
    name: "historial_entrenamientos",
    description: "Últimos entrenamientos registrados por un alumno.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
      },
      required: ["studentId"],
    },
  },

  // ── Escrituras (encolan confirmación, NO ejecutan) ────────────────────────
  {
    name: "registrar_pago",
    description:
      "Registra el pago de una cuota de un alumno. Requiere confirmación del entrenador. Obtené antes el installmentId con suscripcion_alumno.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
        installmentId: { type: Type.STRING, description: "ID de la cuota a pagar" },
        notes: { type: Type.STRING, description: "Nota opcional del pago" },
        ...resumenProp,
      },
      required: ["studentId", "installmentId", "resumen"],
    },
  },
  {
    name: "crear_alumno",
    description:
      "Crea un alumno nuevo y le envía una invitación por email. Requiere confirmación del entrenador.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        firstName: { type: Type.STRING },
        lastName: { type: Type.STRING },
        email: { type: Type.STRING },
        dni: { type: Type.STRING },
        phone: { type: Type.STRING },
        ...resumenProp,
      },
      required: ["firstName", "lastName", "email", "dni", "resumen"],
    },
  },
  {
    name: "crear_suscripcion",
    description:
      "Crea una suscripción para un alumno sobre un plan, generando sus cuotas. Cancela la suscripción activa anterior si la hay. Requiere confirmación.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
        planId: { type: Type.STRING, description: "ID del plan (ver listar_planes)" },
        startDate: {
          type: Type.STRING,
          description: "Fecha de inicio en formato ISO 8601, ej: 2026-08-01T00:00:00Z",
        },
        totalAmount: { type: Type.NUMBER, description: "Monto total de la suscripción" },
        installmentCount: {
          type: Type.INTEGER,
          description: "Cantidad de cuotas (1-24). Default 1.",
        },
        frequency: {
          type: Type.STRING,
          enum: ["BIWEEKLY", "MONTHLY"],
          description: "Frecuencia de las cuotas. Default MONTHLY.",
        },
        ...resumenProp,
      },
      required: ["studentId", "planId", "startDate", "totalAmount", "resumen"],
    },
  },
  {
    name: "asignar_rutina",
    description:
      "Asigna una rutina a un alumno (desactiva la rutina anterior). Requiere confirmación.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "ID del alumno" },
        routineId: { type: Type.STRING, description: "ID de la rutina" },
        notes: { type: Type.STRING, description: "Nota opcional para el alumno" },
        ...resumenProp,
      },
      required: ["studentId", "routineId", "resumen"],
    },
  },
  {
    name: "crear_rutina",
    description:
      "Crea una rutina nueva vacía (después se le agregan ejercicios con agregar_ejercicio_a_rutina). Requiere confirmación.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        ...resumenProp,
      },
      required: ["name", "resumen"],
    },
  },
  {
    name: "agregar_ejercicio_a_rutina",
    description: "Agrega un ejercicio a un día de una rutina. Requiere confirmación.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        routineId: { type: Type.STRING, description: "ID de la rutina" },
        exerciseId: { type: Type.STRING, description: "ID del ejercicio (ver listar_ejercicios)" },
        dayOfWeek: {
          type: Type.STRING,
          enum: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
          ],
        },
        sets: { type: Type.INTEGER, description: "Cantidad de series" },
        reps: { type: Type.STRING, description: "Repeticiones, ej: '10' o '8-12'" },
        order: { type: Type.INTEGER, description: "Orden dentro del día. Default: último." },
        restSeconds: { type: Type.INTEGER, description: "Descanso en segundos. Default 90." },
        suggestedWeight: { type: Type.NUMBER, description: "Peso sugerido en kg" },
        notes: { type: Type.STRING },
        ...resumenProp,
      },
      required: ["routineId", "exerciseId", "dayOfWeek", "sets", "reps", "resumen"],
    },
  },
  {
    name: "crear_ejercicio",
    description:
      "Crea un ejercicio nuevo en el catálogo del entrenador. Obtené los IDs con catalogos_ejercicio. Requiere confirmación.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        muscleGroupId: { type: Type.STRING, description: "ID del grupo muscular" },
        movementType: {
          type: Type.STRING,
          enum: ["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "CORE", "CARDIO", "OLYMPIC"],
        },
        difficulty: {
          type: Type.STRING,
          enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
          description: "Default BEGINNER",
        },
        equipmentId: { type: Type.STRING, description: "ID del equipamiento (opcional)" },
        ...resumenProp,
      },
      required: ["name", "muscleGroupId", "movementType", "resumen"],
    },
  },
];

const WRITE_TOOLS = new Set([
  "registrar_pago",
  "crear_alumno",
  "crear_suscripcion",
  "asignar_rutina",
  "crear_rutina",
  "agregar_ejercicio_a_rutina",
  "crear_ejercicio",
]);

export async function executeTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    if (WRITE_TOOLS.has(name)) {
      const { resumen, ...payload } = args as { resumen?: string } & Record<
        string,
        unknown
      >;
      pendingActions.set(ctx.chatId, {
        type: name,
        payload,
        resumen: resumen ?? `Ejecutar ${name}`,
      });
      return PENDING_RESULT;
    }

    const a = args as Record<string, any>;

    switch (name) {
      case "dashboard_resumen":
        return serialize(await TrainersService.getDashboardSummary(ctx.trainerUserId));
      case "buscar_alumnos":
        return serialize(
          await StudentsService.listStudents(ctx.trainerUserId, {
            page: 1,
            limit: 10,
            search: a.search || undefined,
          })
        );
      case "detalle_alumno":
        return serialize(
          await StudentSummaryService.getStudentSummary(ctx.trainerUserId, a.studentId)
        );
      case "cuotas_por_vencer":
        return serialize(
          await SubscriptionsService.getExpiringSubscriptions(ctx.trainerUserId)
        );
      case "suscripcion_alumno":
        return serialize(
          await SubscriptionsService.getStudentSubscription(ctx.trainerUserId, a.studentId)
        );
      case "listar_planes":
        return serialize(await PlansService.listPlans(ctx.trainerUserId));
      case "listar_rutinas":
        return serialize(await RoutinesService.listRoutines(ctx.trainerUserId));
      case "detalle_rutina":
        return serialize(await RoutinesService.getRoutine(a.routineId));
      case "listar_ejercicios":
        return serialize(
          await ExercisesService.listExercises(ctx.trainerUserId, "TRAINER", {
            search: a.search || undefined,
            muscleGroupId: a.muscleGroupId || undefined,
          })
        );
      case "catalogos_ejercicio":
        return serialize({
          muscleGroups: await ExercisesService.listMuscleGroups(),
          equipment: await ExercisesService.listEquipment(),
        });
      case "rutina_activa_alumno":
        return serialize(
          await RoutinesService.getStudentRoutine(ctx.trainerUserId, a.studentId)
        );
      case "historial_entrenamientos":
        return serialize(
          await RoutinesService.getStudentWorkoutHistory(ctx.trainerUserId, a.studentId)
        );
      default:
        return `ERROR: herramienta desconocida "${name}"`;
    }
  } catch (error: any) {
    return `ERROR: ${error?.message ?? "error desconocido"}`;
  }
}
