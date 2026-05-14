import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const gluteos = await prisma.muscleGroup.findFirst({ where: { slug: "gluteos" } });
  const polea = await prisma.equipment.findFirst({ where: { name: "Polea" } });
  const maquina = await prisma.equipment.findFirst({ where: { name: "Máquina" } });

  // Fix abducción en máquina
  const abduccion = await prisma.exercise.findFirst({
    where: { name: "Abducción de cadera en máquina" },
  });
  if (abduccion) {
    await prisma.exercise.update({
      where: { id: abduccion.id },
      data: {
        mediaUrl: "https://media.vasafitness.com/uploads/2026/03/2026MAR_BooyBuilder-StandingHipAbductor.gif",
        mediaType: "GIF",
        muscleGroupId: gluteos!.id,
        description: "Ejercicio para el glúteo medio en máquina. Se separan las piernas contra resistencia lateral.",
      },
    });
    console.log("✅ Abducción de cadera en máquina — imagen actualizada");
  }

  // Crear abductores en polea
  if (gluteos && polea) {
    const existing = await prisma.exercise.findFirst({
      where: { name: "Abductores en polea" },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: {
          name: "Abductores en polea",
          description: "Abducción de cadera con polea. Trabaja el glúteo medio con tensión constante durante todo el recorrido.",
          muscleGroupId: gluteos.id,
          difficulty: "BEGINNER",
          movementType: "SQUAT",
          equipmentId: polea.id,
          mediaUrl: "https://fitcron.com/wp-content/uploads/2021/04/30481301-Cable-hip-abduction-version-2-male_Hips_720.gif",
          mediaType: "GIF",
          isGlobal: true,
        },
      });
      console.log("✅ Creado: Abductores en polea");
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });