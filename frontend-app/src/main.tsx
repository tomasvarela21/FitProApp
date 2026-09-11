import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { applyTenantTheme } from "./lib/applyTenantTheme";
import { AppRouter } from "./router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary/ErrorBoundary";
import { queryClient } from "@/lib/query-client";

applyTenantTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
