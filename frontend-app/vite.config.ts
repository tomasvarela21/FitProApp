import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("recharts") || id.includes("d3-")) return "charts"
          if (id.includes("react-router") || id.includes("@tanstack/react-query")) return "routing-query"
          if (id.includes("radix-ui") || id.includes("@radix-ui")) return "ui"
          return "vendor"
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
