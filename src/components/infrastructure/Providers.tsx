"use client";

import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/infrastructure/AuthProvider";
import { FilterStateProvider } from "@/components/infrastructure/FilterStateProvider";
import { MaintenanceModal } from "@/components/infrastructure/MaintenanceModal";
import { SavedInzeratyProvider } from "@/components/infrastructure/SavedInzeratyProvider";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) {
    return new QueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = new QueryClient();
  }

  return browserQueryClient;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SavedInzeratyProvider>
          <FilterStateProvider>
            <MaintenanceModal>{children}</MaintenanceModal>
          </FilterStateProvider>
        </SavedInzeratyProvider>
      </AuthProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
