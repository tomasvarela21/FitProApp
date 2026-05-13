import { PrismaClient } from "@prisma/client";
import https from "https";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const BASE_IMAGE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// Mapeo manual para ejercicios cuyo nombre no matchea directamente
const MANUAL_MAP: Record<string, string> = {
  // ✅ Ya mapeados - mantener igual
  "Press de banca plano con barra": "Barbell_Bench_Press_-_Medium_Grip",
  "Press de banca plano con mancuernas": "Dumbbell_Bench_Press",
  "Aperturas con mancuernas en banco plano": "Dumbbell_Flyes",
  "Aperturas en polea cruzada": "Cable_Crossover",
  "Fondos en paralelas (pecho)": "Dips_-_Chest_Version",
  "Pullover con mancuerna": "Straight-Arm_Dumbbell_Pullover",
  "Peso muerto convencional": "Barbell_Deadlift",
  "Peso muerto rumano": "Romanian_Deadlift",
  "Dominadas pronadas": "Wide-Grip_Lat_Pulldown",
  "Dominadas supinas (chin-up)": "Underhand_Cable_Pulldowns",
  "Jalón al pecho en polea": "Wide-Grip_Lat_Pulldown",
  "Remo con mancuerna a una mano": "One-Arm_Dumbbell_Row",
  "Buenos días": "Good_Morning",
  "Hiperextensiones": "Hyperextensions_Back_Extensions",
  "Face pull en polea": "Face_Pull",
  "Sentadilla con barra": "Barbell_Full_Squat",
  "Sentadilla goblet": "Goblet_Squat",
  "Prensa de piernas": "Leg_Press",
  "Estocadas con barra": "Barbell_Lunge",
  "Estocadas con mancuernas": "Dumbbell_Lunges",
  "Leg extension": "Leg_Extensions",
  "Hack squat": "Hack_Squat",
  "Peso muerto sumo": "Sumo_Deadlift",
  "Hip thrust con barra": "Barbell_Hip_Thrust",
  "Press militar con barra": "Barbell_Shoulder_Press",
  "Press de hombros con mancuernas": "Dumbbell_Shoulder_Press",
  "Arnold press": "Arnold_Dumbbell_Press",
  "Elevaciones laterales con mancuernas": "Side_Lateral_Raise",
  "Encogimientos de hombros con barra": "Barbell_Shrug",
  "Curl de bíceps con barra": "Barbell_Curl",
  "Curl de bíceps con barra Z": "EZ-Bar_Curl",
  "Curl alternado con mancuernas": "Dumbbell_Alternate_Bicep_Curl",
  "Curl martillo": "Hammer_Curls",
  "Curl concentrado": "Concentration_Curls",
  "Curl predicador": "Preacher_Curl",
  "Press francés con barra": "EZ-Bar_Skullcrusher",
  "Extensión de tríceps en polea alta": "Triceps_Pushdown",
  "Tríceps en polea con cuerda": "Triceps_Pushdown_-_Rope_Attachment",
  "Close grip press": "Close-Grip_Barbell_Bench_Press",
  "Plancha frontal": "Plank",
  "Crunch en polea": "Cable_Crunch",
  "Russian twist": "Russian_Twist",
  "Rueda abdominal (Ab wheel)": "Ab_Roller",
  "Elevación de piernas colgado": "Hanging_Leg_Raise",
  "Mountain climbers": "Mountain_Climbers",
  "Dead bug": "Dead_Bug",
  "Elevación de talones de pie": "Standing_Calf_Raises",
  "Elevación de talones sentado": "Seated_Calf_Raise",
  "Elíptica": "Elliptical_Trainer",

  // 🔧 Correcciones de IDs
  "Press de banca inclinado con barra": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "Press de banca declinado con barra": "Decline_Barbell_Bench_Press",
  "Press de banca inclinado con mancuernas": "Incline_Dumbbell_Press",
  "Flexiones de brazos": "Pushups",
  "Press en máquina pecho": "Leverage_Chest_Press",
  "Remo con barra": "Bent_Over_Barbell_Row",
  "Remo en polea baja sentado": "Seated_Cable_Rows",
  "Remo en máquina": "Elevated_Cable_Rows",
  "Sentadilla frontal": "Front_Barbell_Squat",
  "Estocadas búlgaras": "Split_Squat_with_Dumbbells",
  "Leg curl acostado": "Lying_Leg_Curls",
  "Hip thrust con mancuerna": "Barbell_Hip_Thrust",
  "Patada trasera en polea": "Glute_Kickback",
  "Abducción de cadera en máquina": "Adductor",
  "Puente de glúteos": "Barbell_Glute_Bridge",
  "Elevaciones laterales en polea": "Side_Lateral_Raise",
  "Elevaciones frontales con mancuernas": "Side_Laterals_to_Front_Raise",
  "Pájaro con mancuernas": "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench",
  "Press en máquina de hombros": "Dumbbell_Shoulder_Press",
  "Copa con mancuerna": "Dumbbell_One-Arm_Triceps_Extension",
  "Fondos en paralelas (tríceps)": "Bench_Dips",
  "Patada de tríceps con mancuerna": "Tricep_Dumbbell_Kickback",
  "Curl en polea baja": "Cable_Hammer_Curls_-_Rope_Attachment",
  "Plancha lateral": "Side_Bridge",
  "Crunch abdominal": "Crunch_-_Hands_Overhead",
  "Dragon flag": "Decline_Crunch",
  "Hollow body": "Ab_Crunch_Machine",
  "Elevación de talones en prensa": "Calf_Press",
  "Cinta de correr": "Running_Treadmill",
  "Bicicleta estática": "Bicycling",
  "Remo ergómetro": "Rowing_Stationary",
  "Salto a la soga": "Rope_Jumping",
  "Burpees": "Front_Box_Jump",
  "Box jumps": "Box_Jump_Multiple_Response",
  "Battle ropes": "Battling_Ropes",
};

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log("📥 Descargando dataset...");
  const dataset = await fetchJson(
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
  ) as Array<{ id: string; name: string; images: string[] }>;

  console.log(`✅ ${dataset.length} ejercicios en el dataset`);

  // Crear mapa por id para búsqueda rápida
  const datasetById = new Map(dataset.map((e) => [e.id, e]));

  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true },
    where: { isGlobal: true },
  });

  console.log(`\n🔍 Mapeando ${exercises.length} ejercicios...\n`);

  let matched = 0;
  let notFound = 0;

  for (const exercise of exercises) {
    const datasetId = MANUAL_MAP[exercise.name];

    if (!datasetId) {
      console.log(`❌ Sin mapeo: ${exercise.name}`);
      notFound++;
      continue;
    }

    const datasetExercise = datasetById.get(datasetId);

    if (!datasetExercise) {
      console.log(`⚠️  ID no encontrado en dataset: ${datasetId} (${exercise.name})`);
      notFound++;
      continue;
    }

    if (!datasetExercise.images || datasetExercise.images.length === 0) {
      console.log(`⚠️  Sin imágenes: ${exercise.name}`);
      notFound++;
      continue;
    }

    const gifUrl = `${BASE_IMAGE_URL}/${datasetExercise.images[0]}`;

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        mediaUrl: gifUrl,
        mediaType: "GIF",
      },
    });

    console.log(`✅ ${exercise.name} → ${datasetExercise.id}`);
    matched++;
  }

  console.log(`\n📊 Resultado: ${matched} mapeados, ${notFound} sin mapeo`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
