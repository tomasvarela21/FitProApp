import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  exercises.forEach((e) => console.log(`${e.id} | ${e.name}`));
  await prisma.$disconnect();
}

main();
