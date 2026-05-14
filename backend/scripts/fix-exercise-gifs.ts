import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const fixes: { name: string; mediaUrl: string; newName?: string }[] = [
  {
    name: "Dragon flag",
    mediaUrl: "https://bodyweighttrainingarena.com/wp-content/uploads/2015/12/Dragon-Flag-one-leg_Gif_Big_14-MB.gif",
  },
  {
    name: "Hollow body",
    mediaUrl: "https://hips.hearstapps.com/hmg-prod/images/workouts/2016/03/lyinghollowbodyhold-1457044774.gif",
    newName: "Hollow hold",
  },
  {
    name: "Mountain climbers",
    mediaUrl: "https://downloads.ctfassets.net/6ilvqec50fal/2Zb0Rud260lcxB6hMmNYKr/0d47f0ed5c7d0744f043eaddda18532a/Mountain_Climbers.gif",
  },
  {
    name: "Elevaciones laterales en polea",
    mediaUrl: "https://www.strengthlog.com/wp-content/uploads/2025/11/cable-lateral-raise.gif",
  },
  {
    name: "Jalón al pecho en polea",
    mediaUrl: "https://cdn.prod.website-files.com/66c501d753ae2a8c705375b6/67ed63d4f06195ec57fc37cc_LatPulldown.gif",
  },
  {
    name: "Remo en máquina",
    mediaUrl: "https://i.pinimg.com/originals/6d/93/7f/6d937ff1cb05cd56dab8eff75d89c7bf.gif",
  },
  {
    name: "Dominadas pronadas",
    mediaUrl: "https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2025/12/pull-ups.gif?resize=700%2C700&ssl=1",
  },
  {
    name: "Hip thrust con mancuerna",
    mediaUrl: "https://media.post.rvohealth.io/wp-content/uploads/sites/2/2022/04/GRT-3.03.DumbellHipThrust.gif",
  },
];

async function main() {
  console.log("🔧 Aplicando correcciones...\n");

  for (const fix of fixes) {
    const exercise = await prisma.exercise.findFirst({ where: { name: fix.name } });
    if (!exercise) {
      console.log(`❌ No encontrado: ${fix.name}`);
      continue;
    }
    await prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        mediaUrl: fix.mediaUrl,
        mediaType: "GIF",
        ...(fix.newName ? { name: fix.newName } : {}),
      },
    });
    console.log(`✅ ${fix.name}${fix.newName ? ` → renombrado a "${fix.newName}"` : ""}`);
  }

  // Crear aducción de cadera en máquina
  const gluteos = await prisma.muscleGroup.findFirst({ where: { slug: "gluteos" } });
  const piernas = await prisma.muscleGroup.findFirst({ where: { slug: "piernas" } });
  const maquina = await prisma.equipment.findFirst({ where: { name: "Máquina" } });

  if (piernas && maquina) {
    const existing = await prisma.exercise.findFirst({
      where: { name: "Aducción de cadera en máquina" },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: {
          name: "Aducción de cadera en máquina",
          description: "Ejercicio para el aductor en máquina. Trabaja la cara interna del muslo cerrando las piernas contra resistencia.",
          muscleGroupId: piernas.id,
          difficulty: "BEGINNER",
          movementType: "SQUAT",
          equipmentId: maquina.id,
          mediaUrl: `${BASE}/Thigh_Adductor/0.jpg`,
          mediaType: "GIF",
          isGlobal: true,
        },
      });
      console.log(`✅ Creado: Aducción de cadera en máquina`);
    } else {
      console.log(`ℹ️  Ya existe: Aducción de cadera en máquina`);
    }
  }

  // Actualizar Abducción — moverla a grupo Glúteos con imagen correcta
  if (gluteos && maquina) {
    const abduccion = await prisma.exercise.findFirst({
      where: { name: "Abducción de cadera en máquina" },
    });
    if (abduccion) {
      await prisma.exercise.update({
        where: { id: abduccion.id },
        data: {
          muscleGroupId: gluteos.id,
          mediaUrl: `${BASE}/Adductor/0.jpg`,
          description: "Ejercicio para el glúteo medio en máquina. Se separan las piernas contra resistencia.",
        },
      });
      console.log(`✅ Actualizado: Abducción de cadera en máquina`);
    }
  }

  console.log("\n🎉 Correcciones aplicadas");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
