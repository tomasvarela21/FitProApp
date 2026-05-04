import { PrismaClient, Difficulty, MovementType, DayOfWeek } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
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

  const [barra, mancuernas, maquina, polea, corporal, barraDominadas, kettlebell, banda, cardioMaquina, trx] = equipment;
  console.log("✅ Equipamiento creado");

  // ─── Exercises ───────────────────────────────────────────
  const exercises = [
    // PECHO
    { name: "Press de banca plano con barra", description: "Ejercicio compuesto para el desarrollo del pecho. Acostado en banco plano, bajar la barra al pecho y empujar.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca inclinado con barra", description: "Variante inclinada para énfasis en el pecho superior.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca declinado con barra", description: "Variante declinada para énfasis en el pecho inferior.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de banca plano con mancuernas", description: "Permite mayor rango de movimiento que la barra.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Press de banca inclinado con mancuernas", description: "Énfasis en pecho superior con mayor libertad de movimiento.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Aperturas con mancuernas en banco plano", description: "Ejercicio de aislamiento para el pecho. Movimiento en arco.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Aperturas en polea cruzada", description: "Permite tensión constante en el pecho durante todo el recorrido.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Fondos en paralelas (pecho)", description: "Ejercicio con peso corporal. Inclinarse hacia adelante para énfasis en pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Flexiones de brazos", description: "Ejercicio básico con peso corporal para el pecho.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Press en máquina pecho", description: "Versión guiada del press de pecho, ideal para principiantes.", muscleGroupId: pecho.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: maquina.id },
    { name: "Pullover con mancuerna", description: "Trabaja pecho y espalda. Acostado en banco, bajar mancuerna por detrás de la cabeza.", muscleGroupId: pecho.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: mancuernas.id },

    // ESPALDA
    { name: "Peso muerto convencional", description: "Rey de los ejercicios de espalda. Levantamiento del suelo con barra.", muscleGroupId: espalda.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Peso muerto rumano", description: "Énfasis en isquiotibiales y glúteos con espalda recta.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Dominadas pronadas", description: "Ejercicio de jalón con peso corporal. Agarre prono ancho.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barraDominadas.id },
    { name: "Dominadas supinas (chin-up)", description: "Agarre supino, mayor activación de bíceps.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barraDominadas.id },
    { name: "Jalón al pecho en polea", description: "Simula las dominadas con carga regulable.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Remo con barra", description: "Ejercicio compuesto para el grosor de la espalda.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Remo con mancuerna a una mano", description: "Permite mayor rango de movimiento que el remo bilateral.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Remo en polea baja sentado", description: "Ejercicio de remo guiado con polea.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Remo en máquina", description: "Versión guiada del remo para principiantes.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: maquina.id },
    { name: "Buenos días", description: "Ejercicio con barra en la espalda para trabajar erector espinal e isquiotibiales.", muscleGroupId: espalda.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Hiperextensiones", description: "Ejercicio para el erector espinal en banco romano.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: maquina.id },
    { name: "Face pull en polea", description: "Trabaja deltoides posterior y manguito rotador.", muscleGroupId: espalda.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },

    // PIERNAS
    { name: "Sentadilla con barra", description: "El ejercicio rey de piernas. Barra en la espalda alta o baja.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Sentadilla frontal", description: "Barra apoyada en los deltoides frontales, mayor énfasis en cuádriceps.", muscleGroupId: piernas.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Sentadilla goblet", description: "Sentadilla con kettlebell o mancuerna al pecho, ideal para principiantes.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: kettlebell.id },
    { name: "Prensa de piernas", description: "Ejercicio de empuje de piernas en máquina.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Estocadas con barra", description: "Ejercicio unilateral para cuádriceps y glúteos.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: barra.id },
    { name: "Estocadas con mancuernas", description: "Versión con mancuernas de las estocadas.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: mancuernas.id },
    { name: "Estocadas búlgaras", description: "Pie trasero elevado, mayor rango de movimiento.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: mancuernas.id },
    { name: "Leg curl acostado", description: "Aislamiento de isquiotibiales en máquina.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: maquina.id },
    { name: "Leg extension", description: "Aislamiento de cuádriceps en máquina.", muscleGroupId: piernas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Hack squat", description: "Sentadilla en máquina con énfasis en cuádriceps.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Peso muerto sumo", description: "Variante del peso muerto con piernas abiertas.", muscleGroupId: piernas.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },

    // GLÚTEOS
    { name: "Hip thrust con barra", description: "El ejercicio más efectivo para glúteos. Barra sobre las caderas.", muscleGroupId: gluteos.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.HINGE, equipmentId: barra.id },
    { name: "Hip thrust con mancuerna", description: "Versión con mancuerna del hip thrust.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: mancuernas.id },
    { name: "Patada trasera en polea", description: "Aislamiento de glúteos con polea en el tobillo.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: polea.id },
    { name: "Abducción de cadera en máquina", description: "Trabajo de glúteo medio en máquina.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Puente de glúteos", description: "Versión de peso corporal del hip thrust.", muscleGroupId: gluteos.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.HINGE, equipmentId: corporal.id },

    // HOMBROS
    { name: "Press militar con barra", description: "Press de hombros con barra de pie o sentado.", muscleGroupId: hombros.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Press de hombros con mancuernas", description: "Mayor libertad de movimiento que con barra.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Arnold press", description: "Variante del press con rotación del antebrazo.", muscleGroupId: hombros.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Elevaciones laterales con mancuernas", description: "Aislamiento del deltoides medio.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Elevaciones laterales en polea", description: "Tensión constante en el deltoides medio.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Elevaciones frontales con mancuernas", description: "Aislamiento del deltoides anterior.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Pájaro con mancuernas", description: "Aislamiento del deltoides posterior inclinado.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Press en máquina de hombros", description: "Versión guiada del press de hombros.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: maquina.id },
    { name: "Encogimientos de hombros con barra", description: "Trabajo de trapecio superior.", muscleGroupId: hombros.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },

    // BÍCEPS
    { name: "Curl de bíceps con barra", description: "Ejercicio básico de bíceps con barra recta.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Curl de bíceps con barra Z", description: "Variante con barra en Z para menos tensión en muñecas.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },
    { name: "Curl alternado con mancuernas", description: "Curl unilateral para mayor rango de movimiento.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl martillo", description: "Agarre neutro, trabaja braquial y braquiorradial.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl concentrado", description: "Aislamiento máximo del bíceps apoyando el codo en el muslo.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: mancuernas.id },
    { name: "Curl en polea baja", description: "Tensión constante en el bíceps.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: polea.id },
    { name: "Curl predicador", description: "Aislamiento del bíceps en banco scott.", muscleGroupId: biceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PULL, equipmentId: barra.id },

    // TRÍCEPS
    { name: "Press francés con barra", description: "Extensión de codo acostado con barra.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },
    { name: "Copa con mancuerna", description: "Extensión de tríceps por detrás de la cabeza.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Extensión de tríceps en polea alta", description: "Aislamiento de tríceps con polea.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Fondos en paralelas (tríceps)", description: "Peso corporal, tronco vertical para énfasis en tríceps.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: corporal.id },
    { name: "Patada de tríceps con mancuerna", description: "Extensión de codo en posición inclinada.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: mancuernas.id },
    { name: "Tríceps en polea con cuerda", description: "Extensión con cuerda para mayor amplitud de movimiento.", muscleGroupId: triceps.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.PUSH, equipmentId: polea.id },
    { name: "Close grip press", description: "Press de banca con agarre cerrado para tríceps.", muscleGroupId: triceps.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.PUSH, equipmentId: barra.id },

    // CORE
    { name: "Plancha frontal", description: "Isométrico para el core. Mantener posición horizontal.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Plancha lateral", description: "Isométrico para el core lateral.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Crunch abdominal", description: "Ejercicio básico de abdominales.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Crunch en polea", description: "Flexión del tronco con resistencia de polea.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: polea.id },
    { name: "Russian twist", description: "Rotación del tronco para oblicuos.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Rueda abdominal (Ab wheel)", description: "Ejercicio avanzado para todo el core.", muscleGroupId: core.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.CORE, equipmentId: maquina.id },
    { name: "Elevación de piernas colgado", description: "Ejercicio para el core inferior colgado de barra.", muscleGroupId: core.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CORE, equipmentId: barraDominadas.id },
    { name: "Mountain climbers", description: "Ejercicio dinámico de core y cardio.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Dead bug", description: "Ejercicio de estabilización del core.", muscleGroupId: core.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Dragon flag", description: "Ejercicio avanzado de core completo.", muscleGroupId: core.id, difficulty: Difficulty.ADVANCED, movementType: MovementType.CORE, equipmentId: corporal.id },
    { name: "Hollow body", description: "Posición isométrica avanzada de core.", muscleGroupId: core.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CORE, equipmentId: corporal.id },

    // PANTORRILLAS
    { name: "Elevación de talones de pie", description: "Ejercicio básico para pantorrillas de pie.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: corporal.id },
    { name: "Elevación de talones sentado", description: "Énfasis en sóleo.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },
    { name: "Elevación de talones en prensa", description: "Pantorrillas en máquina de prensa.", muscleGroupId: pantorrillas.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.SQUAT, equipmentId: maquina.id },

    // CARDIO
    { name: "Cinta de correr", description: "Cardio en cinta, ajustar velocidad e inclinación.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Bicicleta estática", description: "Cardio de bajo impacto en bicicleta.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Remo ergómetro", description: "Cardio de cuerpo completo en máquina de remo.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Elíptica", description: "Cardio de bajo impacto en elíptica.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: cardioMaquina.id },
    { name: "Salto a la soga", description: "Cardio con cuerda de saltar.", muscleGroupId: cardio.id, difficulty: Difficulty.BEGINNER, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Burpees", description: "Ejercicio de cardio y fuerza de cuerpo completo.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Box jumps", description: "Saltos sobre cajón para potencia y cardio.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
    { name: "Battle ropes", description: "Cardio de alta intensidad con cuerdas.", muscleGroupId: cardio.id, difficulty: Difficulty.INTERMEDIATE, movementType: MovementType.CARDIO, equipmentId: corporal.id },
  ];

  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: { ...exercise, isGlobal: true },
      });
    }
  }
  console.log(`✅ ${exercises.length} ejercicios creados`);

  // ─── Rutinas globales ─────────────────────────────────────

  // 1. Full Body 3x
  const fullBody = await prisma.routine.upsert({
    where: { id: "routine-fullbody-3x" },
    update: {},
    create: {
      id: "routine-fullbody-3x",
      name: "Full Body 3x",
      description: "Rutina de cuerpo completo para principiantes. 3 días a la semana con descanso entre sesiones.",
      daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
      isGlobal: true,
    },
  });

  // 2. PPL - Push
  const pplPush = await prisma.routine.upsert({
    where: { id: "routine-ppl-push" },
    update: {},
    create: {
      id: "routine-ppl-push",
      name: "PPL - Push (Empuje)",
      description: "Día de empuje del programa Push Pull Legs. Trabaja pecho, hombros y tríceps.",
      daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.THURSDAY],
      isGlobal: true,
    },
  });

  // 3. PPL - Pull
  const pplPull = await prisma.routine.upsert({
    where: { id: "routine-ppl-pull" },
    update: {},
    create: {
      id: "routine-ppl-pull",
      name: "PPL - Pull (Jalón)",
      description: "Día de jalón del programa Push Pull Legs. Trabaja espalda y bíceps.",
      daysOfWeek: [DayOfWeek.TUESDAY, DayOfWeek.FRIDAY],
      isGlobal: true,
    },
  });

  // 4. PPL - Legs
  const pplLegs = await prisma.routine.upsert({
    where: { id: "routine-ppl-legs" },
    update: {},
    create: {
      id: "routine-ppl-legs",
      name: "PPL - Legs (Piernas)",
      description: "Día de piernas del programa Push Pull Legs.",
      daysOfWeek: [DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY],
      isGlobal: true,
    },
  });

  // 5. Upper/Lower - Upper
  const upperLowerUpper = await prisma.routine.upsert({
    where: { id: "routine-upper-lower-upper" },
    update: {},
    create: {
      id: "routine-upper-lower-upper",
      name: "Upper/Lower - Tren superior",
      description: "Día de tren superior. Trabaja pecho, espalda, hombros y brazos.",
      daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.THURSDAY],
      isGlobal: true,
    },
  });

  // 6. Upper/Lower - Lower
  const upperLowerLower = await prisma.routine.upsert({
    where: { id: "routine-upper-lower-lower" },
    update: {},
    create: {
      id: "routine-upper-lower-lower",
      name: "Upper/Lower - Tren inferior",
      description: "Día de tren inferior. Trabaja piernas, glúteos y core.",
      daysOfWeek: [DayOfWeek.TUESDAY, DayOfWeek.FRIDAY],
      isGlobal: true,
    },
  });

  console.log("✅ Rutinas globales creadas");

  // ─── Ejercicios por rutina ────────────────────────────────

  // Helper para buscar ejercicio por nombre
  const getEx = async (name: string) => {
    const ex = await prisma.exercise.findFirst({ where: { name } });
    if (!ex) throw new Error(`Ejercicio no encontrado: ${name}`);
    return ex;
  };

  // Full Body 3x
  const fbExercises = [
    { name: "Sentadilla con barra", sets: 4, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Press de banca plano con barra", sets: 4, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Remo con barra", sets: 4, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Press militar con barra", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 90 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
    { name: "Plancha frontal", sets: 3, reps: "30-60 seg", suggestedRpe: 6, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: fullBody.id } });
  for (let i = 0; i < fbExercises.length; i++) {
    const ex = await getEx(fbExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: fullBody.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: fbExercises[i].sets,
        reps: fbExercises[i].reps,
        suggestedRpe: fbExercises[i].suggestedRpe,
        restSeconds: fbExercises[i].restSeconds,
      },
    });
  }

  // PPL Push
  const pushExercises = [
    { name: "Press de banca plano con barra", sets: 4, reps: "6-8", suggestedRpe: 8, restSeconds: 180 },
    { name: "Press de banca inclinado con mancuernas", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Aperturas con mancuernas en banco plano", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 90 },
    { name: "Press militar con barra", sets: 3, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Elevaciones laterales con mancuernas", sets: 4, reps: "12-15", suggestedRpe: 7, restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 60 },
    { name: "Copa con mancuerna", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: pplPush.id } });
  for (let i = 0; i < pushExercises.length; i++) {
    const ex = await getEx(pushExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: pplPush.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: pushExercises[i].sets,
        reps: pushExercises[i].reps,
        suggestedRpe: pushExercises[i].suggestedRpe,
        restSeconds: pushExercises[i].restSeconds,
      },
    });
  }

  // PPL Pull
  const pullExercises = [
    { name: "Peso muerto convencional", sets: 4, reps: "5-6", suggestedRpe: 8, restSeconds: 240 },
    { name: "Dominadas pronadas", sets: 4, reps: "6-10", suggestedRpe: 8, restSeconds: 180 },
    { name: "Remo con barra", sets: 3, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Jalón al pecho en polea", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 90 },
    { name: "Remo en polea baja sentado", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 90 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
    { name: "Curl martillo", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: pplPull.id } });
  for (let i = 0; i < pullExercises.length; i++) {
    const ex = await getEx(pullExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: pplPull.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: pullExercises[i].sets,
        reps: pullExercises[i].reps,
        suggestedRpe: pullExercises[i].suggestedRpe,
        restSeconds: pullExercises[i].restSeconds,
      },
    });
  }

  // PPL Legs
  const legsExercises = [
    { name: "Sentadilla con barra", sets: 4, reps: "6-8", suggestedRpe: 8, restSeconds: 180 },
    { name: "Prensa de piernas", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Estocadas búlgaras", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Leg curl acostado", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 90 },
    { name: "Hip thrust con barra", sets: 4, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Elevación de talones de pie", sets: 4, reps: "15-20", suggestedRpe: 7, restSeconds: 60 },
    { name: "Plancha frontal", sets: 3, reps: "30-60 seg", suggestedRpe: 6, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: pplLegs.id } });
  for (let i = 0; i < legsExercises.length; i++) {
    const ex = await getEx(legsExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: pplLegs.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: legsExercises[i].sets,
        reps: legsExercises[i].reps,
        suggestedRpe: legsExercises[i].suggestedRpe,
        restSeconds: legsExercises[i].restSeconds,
      },
    });
  }

  // Upper/Lower - Upper
  const upperExercises = [
    { name: "Press de banca plano con barra", sets: 4, reps: "6-8", suggestedRpe: 8, restSeconds: 180 },
    { name: "Remo con barra", sets: 4, reps: "6-8", suggestedRpe: 8, restSeconds: 180 },
    { name: "Press militar con barra", sets: 3, reps: "8-10", suggestedRpe: 7, restSeconds: 120 },
    { name: "Dominadas pronadas", sets: 3, reps: "6-10", suggestedRpe: 8, restSeconds: 120 },
    { name: "Elevaciones laterales con mancuernas", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 60 },
    { name: "Curl de bíceps con barra", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
    { name: "Extensión de tríceps en polea alta", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: upperLowerUpper.id } });
  for (let i = 0; i < upperExercises.length; i++) {
    const ex = await getEx(upperExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: upperLowerUpper.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: upperExercises[i].sets,
        reps: upperExercises[i].reps,
        suggestedRpe: upperExercises[i].suggestedRpe,
        restSeconds: upperExercises[i].restSeconds,
      },
    });
  }

  // Upper/Lower - Lower
  const lowerExercises = [
    { name: "Sentadilla con barra", sets: 4, reps: "6-8", suggestedRpe: 8, restSeconds: 180 },
    { name: "Peso muerto rumano", sets: 3, reps: "8-10", suggestedRpe: 7, restSeconds: 150 },
    { name: "Prensa de piernas", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Hip thrust con barra", sets: 3, reps: "10-12", suggestedRpe: 7, restSeconds: 120 },
    { name: "Leg curl acostado", sets: 3, reps: "12-15", suggestedRpe: 7, restSeconds: 90 },
    { name: "Elevación de talones de pie", sets: 4, reps: "15-20", suggestedRpe: 7, restSeconds: 60 },
    { name: "Russian twist", sets: 3, reps: "20 total", suggestedRpe: 6, restSeconds: 60 },
  ];

  await prisma.routineExercise.deleteMany({ where: { routineId: upperLowerLower.id } });
  for (let i = 0; i < lowerExercises.length; i++) {
    const ex = await getEx(lowerExercises[i].name);
    await prisma.routineExercise.create({
      data: {
        routineId: upperLowerLower.id,
        exerciseId: ex.id,
        order: i + 1,
        sets: lowerExercises[i].sets,
        reps: lowerExercises[i].reps,
        suggestedRpe: lowerExercises[i].suggestedRpe,
        restSeconds: lowerExercises[i].restSeconds,
      },
    });
  }

  console.log("✅ Ejercicios de rutinas asignados");
  console.log("🎉 Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
