import { config } from "dotenv";
import { resolve } from "path";

// Carga .env desde la raíz del backend antes de cualquier test
config({ path: resolve(__dirname, "../../.env") });
