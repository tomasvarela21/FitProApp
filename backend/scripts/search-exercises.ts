import https from "https";

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

async function main() {
  const dataset = await fetchJson(
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
  ) as Array<{ id: string; name: string }>;

  const searchTerms = [
  "cable lateral",
  "burpee",
  "dragon",
  "hollow",
  "seated row",
  "machine row",
  "lever row",
  "lat pulldown",
  "pull-up",
  "hip thrust",
  "dumbbell hip",
  "adductor",
  "hip adduction",
  "abduction machine"
  ];

  for (const term of searchTerms) {
    const matches = dataset.filter(e =>
      e.name.toLowerCase().includes(term.toLowerCase())
    );
    if (matches.length > 0) {
      console.log(`\n🔍 "${term}":`);
      matches.forEach(e => console.log(`   ${e.id} → ${e.name}`));
    }
  }
}

main();
