import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("No se pudo localizar la CLI de npm");
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: false,
});

if (!result.stdout) {
  console.error(result.stderr || "npm audit no produjo un reporte");
  process.exit(1);
}

const report = JSON.parse(result.stdout);
const acceptedToolingFindings = new Set(["@prisma/config", "deepmerge-ts", "prisma"]);
const blocking = Object.values(report.vulnerabilities ?? {}).filter(
  (finding) =>
    ["high", "critical"].includes(finding.severity) &&
    !acceptedToolingFindings.has(finding.name)
);

if (blocking.length > 0) {
  console.error(
    `Dependencias de riesgo alto o crítico sin excepción: ${blocking
      .map((finding) => finding.name)
      .join(", ")}`
  );
  process.exit(1);
}

const accepted = Object.values(report.vulnerabilities ?? {}).filter((finding) =>
  acceptedToolingFindings.has(finding.name)
);
if (accepted.length > 0) {
  console.warn(
    "Excepción temporal: npm reporta la cadena de configuración de Prisma CLI; " +
      "no hay corrección ascendente compatible y no procesa entradas HTTP."
  );
}

console.log("Auditoría de dependencias de producción sin hallazgos altos no aceptados.");
