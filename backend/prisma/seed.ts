import { PrismaClient, Difficulty, MovementType, DayOfWeek } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Muscle Groups ───────────────────────────────────────
  const muscleGroups = await Promise.all([
    prisma.muscleGroup.upsert({ where: { slug: "pecho" }, update: {}, create: { name: "Pecho", slug: "pecho" } }),
    prisma.muscleGroup.upsert({ where: { slug: "espalda" }, update: {}, create: { name: "Espalda", slug: "espalda" } }),
    prisma.muscleGroup.upsert({ where: { slug: "piernas" }, update: {}, create: { name: "Piernas", slug: "piernas" } }),
    prisma.muscleGroup.upsert({ where: { slug: "hombros" }, update: {}, create: { name: "Hombros", slug: "hombros" } }),
    prisma.muscleGroup.upsert({ where: { slug: "biceps" }, update: {}, create: { name: "Bíceps", slug: "biceps" } }),
    prisma.muscleGroup.upsert({ where: { slug: "triceps" }, update: {}, create: { name: "Tríceps", slug: "triceps" } }),
    prisma.muscleGroup.upsert({ where: { slug: "core" }, update: {}, create: { name: "Core", slug: "core" } }),
    prisma.muscleGroup.upsert({ where: { slug: "cardio" }, update: {}, create: { name: "Cardio", slug: "cardio" } }),
    prisma.muscleGroup.upsert({ where: { slug: "gluteos" }, update: {}, create: { name: "Glúteos", slug: "gluteos" } }),
    prisma.muscleGroup.upsert({ where: { slug: "pantorrillas" }, update: {}, create: { name: "Pantorrillas", slug: "pantorrillas" } }),
  ]);

  const [pecho, espalda, piernas, hombros, biceps, triceps, core, cardio, gluteos, pantorrillas] = muscleGroups;
  console.log("✅ Grupos musculares creados");

  // ─── Equipment ───────────────────────────────────────────
  const equipment = await Promise.all([
    prisma.equipment.upsert({ where: { name: "Barra" }, update: {}, create: { name: "Barra" } }),
    prisma.equipment.upsert({ where: { name: "Mancuernas" }, update: {}, create: { name: "Mancuernas" } }),
    prisma.equipment.upsert({ where: { name: "Máquina" }, update: {}, create: { name: "Máquina" } }),
    prisma.equipment.upsert({ where: { name: "Polea" }, update: {}, create: { name: "Polea" } }),
    prisma.equipment.upsert({ where: { name: "Peso corporal" }, update: {}, create: { name: "Peso corporal" } }),
    prisma.equipment.upsert({ where: { name: "Barra dominadas" }, update: {}, create: { name: "Barra dominadas" } }),
    prisma.equipment.upsert({ where: { name: "Kettlebell" }, update: {}, create: { name: "Kettlebell" } }),
    prisma.equipment.upsert({ where: { name: "Banda elástica" }, update: {}, create: { name: "Banda elástica" } }),
    prisma.equipment.upsert({ where: { name: "Cardio máquina" }, update: {}, create: { name: "Cardio máquina" } }),
    prisma.equipment.upsert({ where: { name: "TRX" }, update: {}, create: { name: "TRX" } }),
  ]);

  const [barra, mancuernas, maquina, polea, corporal, barraDominadas, kettlebell, , cardioMaquina] = equipment;
  console.log("✅ Equipamiento creado");

  // ─── Exercises ───────────────────────────────────────────
  const exercises = [
    // PECHO
    { name: "Press de banca plano con barra", description: "Ejercicio compuesto para el desarrollo del pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca inclinado con barra", description: "Variante inclinada para énfasis en el pecho superior.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca declinado con barra", description: "Variante declinada para énfasis en el pecho inferior.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca plano con mancuernas", description: "Permite mayor rango de movimiento que la barra.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Press de banca inclinado con mancuernas", description: "Énfasis en pecho superior.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Aperturas con mancuernas en banco plano", description: "Ejercicio de aislamiento para el pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Aperturas en polea cruzada", description: "Tensión constante en el pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Fondos en paralelas (pecho)", description: "Inclinarse hacia adelante para énfasis en pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Flexiones de brazos", description: "Ejercicio básico con peso corporal.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Press en máquina pecho", description: "Versión guiada del press de pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: maquina.id },
    { name: "Pullover con mancuerna", description: "Trabaja pecho y espalda.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    // ESPALDA
    { name: "Peso muerto convencional", description: "Rey de los ejercicios de espalda.", muscleGroupId: espalda.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Peso muerto rumano", description: "Énfasis en isquiotibiales y glúteos.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Dominadas pronadas", description: "Ejercicio de jalón con peso corporal.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barraDominadas.id },
    { name: "Dominadas supinas (chin-up)", description: "Agarre supino, mayor activación de bíceps.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barraDominadas.id },
    { name: "Jalón al pecho en polea", description: "Simula las dominadas con carga regulable.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Remo con barra", description: "Ejercicio compuesto para el grosor de la espalda.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Remo con mancuerna a una mano", description: "Mayor rango de movimiento.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Remo en polea baja sentado", description: "Ejercicio de remo guiado.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Remo en máquina", description: "Versión guiada del remo.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: maquina.id },
    { name: "Buenos días", description: "Trabaja erector espinal e isquiotibiales.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Hiperextensiones", description: "Ejercicio para el erector espinal.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: maquina.id },
    { name: "Face pull en polea", description: "Trabaja deltoides posterior y manguito rotador.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    // PIERNAS
    { name: "Sentadilla con barra", description: "El ejercicio rey de piernas.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Sentadilla frontal", description: "Mayor énfasis en cuádriceps.", muscleGroupId: piernas.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Sentadilla goblet", description: "Ideal para principiantes.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: kettlebell.id },
    { name: "Prensa de piernas", description: "Ejercicio de empuje de piernas en máquina.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Estocadas con barra", description: "Ejercicio unilateral.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Estocadas con mancuernas", description: "Versión con mancuernas.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: mancuernas.id },
    { name: "Estocadas búlgaras", description: "Pie trasero elevado, mayor rango.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: mancuernas.id },
    { name: "Leg curl acostado", description: "Aislamiento de isquiotibiales.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: maquina.id },
    { name: "Leg extension", description: "Aislamiento de cuádriceps.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Hack squat", description: "Sentadilla en máquina.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Peso muerto sumo", description: "Variante con piernas abiertas.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    // GLÚTEOS
    { name: "Hip thrust con barra", description: "El ejercicio más efectivo para glúteos.", muscleGroupId: gluteos.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Hip thrust con mancuerna", description: "Versión con mancuerna.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: mancuernas.id },
    { name: "Patada trasera en polea", description: "Aislamiento de glúteos.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: polea.id },
    { name: "Abducción de cadera en máquina", description: "Trabajo de glúteo medio.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Puente de glúteos", description: "Versión de peso corporal.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: corporal.id },
    // HOMBROS
    { name: "Press militar con barra", description: "Press de hombros con barra.", muscleGroupId: hombros.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de hombros con mancuernas", description: "Mayor libertad de movimiento.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Arnold press", description: "Variante con rotación del antebrazo.", muscleGroupId: hombros.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Elevaciones laterales con mancuernas", description: "Aislamiento del deltoides medio.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Elevaciones laterales en polea", description: "Tensión constante.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Elevaciones frontales con mancuernas", description: "Aislamiento del deltoides anterior.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Pájaro con mancuernas", description: "Aislamiento del deltoides posterior.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Press en máquina de hombros", description: "Versión guiada.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: maquina.id },
    { name: "Encogimientos de hombros con barra", description: "Trabajo de trapecio superior.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    // BÍCEPS
    { name: "Curl de bíceps con barra", description: "Ejercicio básico de bíceps.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Curl de bíceps con barra Z", description: "Menos tensión en muñecas.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Curl alternado con mancuernas", description: "Mayor rango de movimiento.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl martillo", description: "Trabaja braquial y braquiorradial.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl concentrado", description: "Aislamiento máximo del bíceps.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl en polea baja", description: "Tensión constante en el bíceps.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Curl predicador", description: "Aislamiento en banco scott.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    // TRÍCEPS
    { name: "Press francés con barra", description: "Extensión de codo acostado.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Copa con mancuerna", description: "Extensión por detrás de la cabeza.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Extensión de tríceps en polea alta", description: "Aislamiento con polea.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Fondos en paralelas (tríceps)", description: "Tronco vertical para énfasis en tríceps.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Patada de tríceps con mancuerna", description: "Extensión en posición inclinada.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Tríceps en polea con cuerda", description: "Mayor amplitud de movimiento.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Close grip press", description: "Press con agarre cerrado para tríceps.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    // CORE
    { name: "Plancha frontal", description: "Isométrico para el core.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Plancha lateral", description: "Isométrico para el core lateral.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Crunch abdominal", description: "Ejercicio básico de abdominales.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Crunch en polea", description: "Flexión del tronco con resistencia.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: polea.id },
    { name: "Russian twist", description: "Rotación del tronco para oblicuos.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Rueda abdominal (Ab wheel)", description: "Ejercicio avanzado para todo el core.", muscleGroupId: core.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.CORE, equipmentId: maquina.id },
    { name: "Elevación de piernas colgado", description: "Core inferior colgado de barra.", muscleGroupId: core.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CORE, equipmentId: barraDominadas.id },
    { name: "Mountain climbers", description: "Ejercicio dinámico de core y cardio.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Dead bug", description: "Estabilización del core.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Dragon flag", description: "Ejercicio avanzado de core completo.", muscleGroupId: core.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Hollow body", description: "Posición isométrica avanzada.", muscleGroupId: core.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CORE, equipmentId: corporal.id },
    // PANTORRILLAS
    { name: "Elevación de talones de pie", description: "Ejercicio básico para pantorrillas.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: corporal.id },
    { name: "Elevación de talones sentado", description: "Énfasis en sóleo.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Elevación de talones en prensa", description: "Pantorrillas en máquina de prensa.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    // CARDIO
    { name: "Cinta de correr", description: "Cardio en cinta.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Bicicleta estática", description: "Cardio de bajo impacto.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Remo ergómetro", description: "Cardio de cuerpo completo.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Elíptica", description: "Cardio de bajo impacto.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Salto a la soga", description: "Cardio con cuerda de saltar.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Burpees", description: "Cardio y fuerza de cuerpo completo.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Box jumps", description: "Saltos sobre cajón.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Battle ropes", description: "Cardio de alta intensidad con cuerdas.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
  ];

  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({ where: { name: exercise.name } });
    if (!existing) {
      await prisma.exercise.create({ data: { ...exercise, isGlobal: true } });
    }
  }
  console.log(`✅ Ejercicios creados`);

  // Helper
  const getEx = async (name: string) => {
    const ex = await prisma.exercise.findFirst({ where: { name } });
    if (!ex) throw new Error(`Ejercicio no encontrado: ${name}`);
    return ex;
  };

  // ─── Rutinas globales ─────────────────────────────────────

  // 1. Full Body 3x (Lun/Mié/Vie — misma rutina cada día)
  const fullBody = await prisma.routine.upsert({
    where: { id: "routine-fullbody-3x" },
    update: {},
    create: { id: "routine-fullbody-3x", name: "Full Body 3x", description: "Rutina de cuerpo completo para principiantes. 3 días a la semana.", isGlobal: true },
  });

  await prisma.routineExercise.deleteMany({ where: { routineId: fullBody.id } });
  const fbExercises = [
    { name: "Sentadilla con barra", sets: 4, reps: "8-10", restSeconds: 120 },
    { name: "Press de banca plano con barra", sets: 4, reps: "8-10", restSeconds: 120 },
    { name: "Remo con barra", sets: 4, reps: "8-10", restSeconds: 120 },
    { name: "Press militar con barra", sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Plancha frontal", sets: 3, reps: "30-60 seg", restSeconds: 60 },
  ];
  for (const day of [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]) {
    for (let i = 0; i < fbExercises.length; i++) {
      const ex = await getEx(fbExercises[i].name);
      await prisma.routineExercise.create({
        data: { routineId: fullBody.id, exerciseId: ex.id, dayOfWeek: day, order: i + 1, sets: fbExercises[i].sets, reps: fbExercises[i].reps, restSeconds: fbExercises[i].restSeconds },
      });
    }
  }

  // 2. PPL (Push/Pull/Legs — Lun=Push, Mar=Pull, Jue=Push, Vie=Pull, Mié=Legs, Sáb=Legs)
  const ppl = await prisma.routine.upsert({
    where: { id: "routine-ppl" },
    update: {},
    create: { id: "routine-ppl", name: "Push Pull Legs (PPL)", description: "Programa de 6 días dividido en empuje, jalón y piernas. Para intermedios.", isGlobal: true },
  });

  await prisma.routineExercise.deleteMany({ where: { routineId: ppl.id } });

  const pushEx = [
    { name: "Press de banca plano con barra", sets: 4, reps: "6-8", restSeconds: 180 },
    { name: "Press de banca inclinado con mancuernas", sets: 3, reps: "10-12", restSeconds: 120 },
    { name: "Aperturas con mancuernas en banco plano", sets: 3, reps: "12-15", restSeconds: 90 },
    { name: "Press militar con barra", sets: 3, reps: "8-10", restSeconds: 120 },
    { name: "Elevaciones laterales con mancuernas", sets: 4, reps: "12-15", restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Copa con mancuerna", sets: 3, reps: "10-12", restSeconds: 60 },
  ];

  const pullEx = [
    { name: "Peso muerto convencional", sets: 4, reps: "5-6", restSeconds: 240 },
    { name: "Dominadas pronadas", sets: 4, reps: "6-10", restSeconds: 180 },
    { name: "Remo con barra", sets: 3, reps: "8-10", restSeconds: 120 },
    { name: "Jalón al pecho en polea", sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Remo en polea baja sentado", sets: 3, reps: "12-15", restSeconds: 90 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl martillo", sets: 3, reps: "12-15", restSeconds: 60 },
  ];

  const legsEx = [
    { name: "Sentadilla con barra", sets: 4, reps: "6-8", restSeconds: 180 },
    { name: "Prensa de piernas", sets: 3, reps: "10-12", restSeconds: 120 },
    { name: "Estocadas búlgaras", sets: 3, reps: "10-12", restSeconds: 120 },
    { name: "Leg curl acostado", sets: 3, reps: "12-15", restSeconds: 90 },
    { name: "Hip thrust con barra", sets: 4, reps: "10-12", restSeconds: 120 },
    { name: "Elevación de talones de pie", sets: 4, reps: "15-20", restSeconds: 60 },
    { name: "Plancha frontal", sets: 3, reps: "30-60 seg", restSeconds: 60 },
  ];

  for (const [day, list] of [
    [DayOfWeek.MONDAY, pushEx],
    [DayOfWeek.TUESDAY, pullEx],
    [DayOfWeek.WEDNESDAY, legsEx],
    [DayOfWeek.THURSDAY, pushEx],
    [DayOfWeek.FRIDAY, pullEx],
    [DayOfWeek.SATURDAY, legsEx],
  ] as [DayOfWeek, typeof pushEx][]) {
    for (let i = 0; i < list.length; i++) {
      const ex = await getEx(list[i].name);
      await prisma.routineExercise.create({
        data: { routineId: ppl.id, exerciseId: ex.id, dayOfWeek: day, order: i + 1, sets: list[i].sets, reps: list[i].reps, restSeconds: list[i].restSeconds },
      });
    }
  }

  // 3. Upper/Lower (Lun/Jue=Upper, Mar/Vie=Lower)
  const upperLower = await prisma.routine.upsert({
    where: { id: "routine-upper-lower" },
    update: {},
    create: { id: "routine-upper-lower", name: "Upper/Lower Split", description: "División en tren superior e inferior. 4 días a la semana para intermedios.", isGlobal: true },
  });

  await prisma.routineExercise.deleteMany({ where: { routineId: upperLower.id } });

  const upperEx = [
    { name: "Press de banca plano con barra", sets: 4, reps: "6-8", restSeconds: 180 },
    { name: "Remo con barra", sets: 4, reps: "6-8", restSeconds: 180 },
    { name: "Press militar con barra", sets: 3, reps: "8-10", restSeconds: 120 },
    { name: "Dominadas pronadas", sets: 3, reps: "6-10", restSeconds: 120 },
    { name: "Elevaciones laterales con mancuernas", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "10-12", restSeconds: 60 },
  ];

  const lowerEx = [
    { name: "Sentadilla con barra", sets: 4, reps: "6-8", restSeconds: 180 },
    { name: "Peso muerto rumano", sets: 3, reps: "8-10", restSeconds: 150 },
    { name: "Prensa de piernas", sets: 3, reps: "10-12", restSeconds: 120 },
    { name: "Hip thrust con barra", sets: 3, reps: "10-12", restSeconds: 120 },
    { name: "Leg curl acostado", sets: 3, reps: "12-15", restSeconds: 90 },
    { name: "Elevación de talones de pie", sets: 4, reps: "15-20", restSeconds: 60 },
    { name: "Russian twist", sets: 3, reps: "20 total", restSeconds: 60 },
  ];

  for (const [day, list] of [
    [DayOfWeek.MONDAY, upperEx],
    [DayOfWeek.TUESDAY, lowerEx],
    [DayOfWeek.THURSDAY, upperEx],
    [DayOfWeek.FRIDAY, lowerEx],
  ] as [DayOfWeek, typeof upperEx][]) {
    for (let i = 0; i < list.length; i++) {
      const ex = await getEx(list[i].name);
      await prisma.routineExercise.create({
        data: { routineId: upperLower.id, exerciseId: ex.id, dayOfWeek: day, order: i + 1, sets: list[i].sets, reps: list[i].reps, restSeconds: list[i].restSeconds },
      });
    }
  }

  // 4. Hipertrofia A/B
  const hipertrofia = await prisma.routine.upsert({
    where: { id: "routine-hipertrofia-ab" },
    update: {},
    create: { id: "routine-hipertrofia-ab", name: "Hipertrofia A/B", description: "Volumen alto para hipertrofia. 4 días alternando dos sesiones.", isGlobal: true },
  });

  await prisma.routineExercise.deleteMany({ where: { routineId: hipertrofia.id } });

  const hiperAEx = [
    { name: "Press de banca plano con barra", sets: 4, reps: "8-12", restSeconds: 120 },
    { name: "Press de banca inclinado con mancuernas", sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Aperturas en polea cruzada", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Press militar con barra", sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Elevaciones laterales con mancuernas", sets: 4, reps: "15-20", restSeconds: 45 },
    { name: "Tríceps en polea con cuerda", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Press francés con barra", sets: 3, reps: "10-12", restSeconds: 60 },
  ];

  const hiperBEx = [
    { name: "Dominadas supinas (chin-up)", sets: 4, reps: "6-10", restSeconds: 180 },
    { name: "Remo con mancuerna a una mano", sets: 4, reps: "10-12", restSeconds: 90 },
    { name: "Jalón al pecho en polea", sets: 3, reps: "12-15", restSeconds: 90 },
    { name: "Face pull en polea", sets: 3, reps: "15-20", restSeconds: 60 },
    { name: "Curl de bíceps con barra Z", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl martillo", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Crunch en polea", sets: 3, reps: "15-20", restSeconds: 45 },
  ];

  for (const [day, list] of [
    [DayOfWeek.MONDAY, hiperAEx],
    [DayOfWeek.TUESDAY, hiperBEx],
    [DayOfWeek.THURSDAY, hiperAEx],
    [DayOfWeek.FRIDAY, hiperBEx],
  ] as [DayOfWeek, typeof hiperAEx][]) {
    for (let i = 0; i < list.length; i++) {
      const ex = await getEx(list[i].name);
      await prisma.routineExercise.create({
        data: { routineId: hipertrofia.id, exerciseId: ex.id, dayOfWeek: day, order: i + 1, sets: list[i].sets, reps: list[i].reps, restSeconds: list[i].restSeconds },
      });
    }
  }

  // 5. Fuerza 5x5
  const fuerza = await prisma.routine.upsert({
    where: { id: "routine-fuerza-5x5" },
    update: {},
    create: { id: "routine-fuerza-5x5", name: "Fuerza 5x5", description: "Programa de fuerza basado en Stronglift. 3 días alternando dos sesiones.", isGlobal: true },
  });

  await prisma.routineExercise.deleteMany({ where: { routineId: fuerza.id } });

  const fuerzaAEx = [
    { name: "Sentadilla con barra", sets: 5, reps: "5", restSeconds: 300 },
    { name: "Press de banca plano con barra", sets: 5, reps: "5", restSeconds: 300 },
    { name: "Remo con barra", sets: 5, reps: "5", restSeconds: 300 },
  ];

  const fuerzaBEx = [
    { name: "Sentadilla con barra", sets: 5, reps: "5", restSeconds: 300 },
    { name: "Press militar con barra", sets: 5, reps: "5", restSeconds: 300 },
    { name: "Peso muerto convencional", sets: 1, reps: "5", restSeconds: 300 },
  ];

  for (const [day, list] of [
    [DayOfWeek.MONDAY, fuerzaAEx],
    [DayOfWeek.WEDNESDAY, fuerzaBEx],
    [DayOfWeek.FRIDAY, fuerzaAEx],
  ] as [DayOfWeek, typeof fuerzaAEx][]) {
    for (let i = 0; i < list.length; i++) {
      const ex = await getEx(list[i].name);
      await prisma.routineExercise.create({
        data: { routineId: fuerza.id, exerciseId: ex.id, dayOfWeek: day, order: i + 1, sets: list[i].sets, reps: list[i].reps, restSeconds: list[i].restSeconds },
      });
    }
  }

  console.log("✅ Rutinas globales creadas con ejercicios por día");
  console.log("🎉 Seed completado exitosamente");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
