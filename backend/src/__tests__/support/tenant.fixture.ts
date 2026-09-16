import type { PrismaClient } from "@prisma/client";

export async function createTenantFixture(prisma: PrismaClient) {
  const [tenantA, tenantB] = await Promise.all([
    prisma.user.create({
      data: {
        email: "trainer-a@fitpro.test",
        role: "TRAINER",
        status: "ACTIVE",
        trainer: { create: { firstName: "Ana", lastName: "Trainer" } },
      },
      include: { trainer: true },
    }),
    prisma.user.create({
      data: {
        email: "trainer-b@fitpro.test",
        role: "TRAINER",
        status: "ACTIVE",
        trainer: { create: { firstName: "Bruno", lastName: "Trainer" } },
      },
      include: { trainer: true },
    }),
  ]);

  const studentAUser = await prisma.user.create({
    data: {
      email: "student-a@fitpro.test",
      role: "STUDENT",
      status: "ACTIVE",
      student: {
        create: {
          trainerId: tenantA.trainer!.id,
          email: "student-a@fitpro.test",
          dni: "10000001",
          firstName: "Alma",
          lastName: "Student",
          status: "ACTIVE",
        },
      },
    },
    include: { student: true },
  });

  const studentBUser = await prisma.user.create({
    data: {
      email: "student-b@fitpro.test",
      role: "STUDENT",
      status: "ACTIVE",
      student: {
        create: {
          trainerId: tenantB.trainer!.id,
          email: "student-b@fitpro.test",
          dni: "10000002",
          firstName: "Beto",
          lastName: "Student",
          status: "ACTIVE",
        },
      },
    },
    include: { student: true },
  });

  const muscleGroup = await prisma.muscleGroup.create({
    data: { name: "Fixture Core", slug: "fixture-core" },
  });

  const [globalExercise, privateExerciseA, privateExerciseB] = await Promise.all([
    prisma.exercise.create({
      data: {
        name: "Global fixture exercise",
        muscleGroupId: muscleGroup.id,
        movementType: "CORE",
        isGlobal: true,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Tenant A fixture exercise",
        muscleGroupId: muscleGroup.id,
        movementType: "CORE",
        trainerId: tenantA.trainer!.id,
      },
    }),
    prisma.exercise.create({
      data: {
        name: "Tenant B fixture exercise",
        muscleGroupId: muscleGroup.id,
        movementType: "CORE",
        trainerId: tenantB.trainer!.id,
      },
    }),
  ]);

  const routineA = await prisma.routine.create({
    data: {
      name: "Tenant A fixture routine",
      trainerId: tenantA.trainer!.id,
      routineExercises: {
        create: {
          exerciseId: privateExerciseA.id,
          dayOfWeek: "MONDAY",
          order: 1,
          sets: 3,
          reps: "10",
        },
      },
    },
    include: { routineExercises: true },
  });

  const studentRoutine = await prisma.studentRoutine.create({
    data: {
      studentId: studentAUser.student!.id,
      routineId: routineA.id,
      isActive: true,
      weeklyPlanWeeks: { create: { weekNumber: 1 } },
    },
  });

  const workoutLog = await prisma.workoutLog.create({
    data: {
      studentId: studentAUser.student!.id,
      studentRoutineId: studentRoutine.id,
      routineId: routineA.id,
      routineName: routineA.name,
      date: new Date("2026-01-15T12:00:00.000Z"),
      businessDate: new Date("2026-01-15T00:00:00.000Z"),
      workoutSets: {
        create: {
          routineExerciseId: routineA.routineExercises[0].id,
          exerciseId: privateExerciseA.id,
          exerciseName: privateExerciseA.name,
          exerciseOrder: routineA.routineExercises[0].order,
          exerciseMuscleGroupName: muscleGroup.name,
          routineDayOfWeek: routineA.routineExercises[0].dayOfWeek,
          prescribedSets: routineA.routineExercises[0].sets,
          prescribedReps: routineA.routineExercises[0].reps,
          prescribedWeight: routineA.routineExercises[0].suggestedWeight,
          prescribedRpe: routineA.routineExercises[0].suggestedRpe,
          prescribedRestSeconds: routineA.routineExercises[0].restSeconds,
          prescribedNotes: routineA.routineExercises[0].notes,
          setNumber: 1,
          reps: 10,
          weight: 20,
        },
      },
    },
  });

  const plan = await prisma.plan.create({
    data: {
      trainerId: tenantA.trainer!.id,
      name: "Tenant A fixture plan",
      price: 100,
      duration: "MONTHLY",
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      trainerId: tenantA.trainer!.id,
      studentId: studentAUser.student!.id,
      planId: plan.id,
      planName: plan.name,
      planDuration: plan.duration,
      startDate: new Date("2026-01-01T12:00:00.000Z"),
      endDate: new Date("2026-01-31T12:00:00.000Z"),
      totalAmount: 100,
      installmentCount: 1,
      frequency: "MONTHLY",
      installments: {
        create: {
          trainerId: tenantA.trainer!.id,
          number: 1,
          amount: 100,
          dueDate: new Date("2026-01-01T12:00:00.000Z"),
        },
      },
    },
  });

  return {
    trainerA: tenantA.trainer!,
    trainerB: tenantB.trainer!,
    studentA: studentAUser.student!,
    studentB: studentBUser.student!,
    globalExercise,
    privateExerciseA,
    privateExerciseB,
    routineA,
    studentRoutine,
    workoutLog,
    plan,
    subscription,
  };
}
