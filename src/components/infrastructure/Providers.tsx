"use client";

import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useEffect } from "react";
import { AuthProvider } from "@/components/infrastructure/AuthProvider";
import { FilterStateProvider } from "@/components/infrastructure/FilterStateProvider";
import { LiquidGlassPrewarm } from "@/components/infrastructure/LiquidGlassPrewarm";
import { MaintenanceModal } from "@/components/infrastructure/MaintenanceModal";
import { SavedInzeratyProvider } from "@/components/infrastructure/SavedInzeratyProvider";
import { type LiquidGlassPrewarmConfig, prewarmLiquidGlass } from "@/components/layout/LiquidGlass";

// Hardcoded prewarm — jen pro komponenty s přesně známou velikostí (header pill).
// Vše ostatní (CompactFilterBar, reset chip, ...) prewarmuje LiquidGlassPrewarm
// off-screen mountem reálné komponenty → přesné rozměry bez guessingu.
const LIQUID_GLASS_PREWARM: LiquidGlassPrewarmConfig[] = [
  // Header pill — oba stavy (showSlot true/false)
  { width: 720, height: 48, glassThickness: 80, bezelWidth: 60 },
  { width: 560, height: 48, glassThickness: 80, bezelWidth: 60 },
  // HeaderRightSlot (cenová pilulka vedle headeru na detailu inzerátu) — pár typických šířek
  // pro různě dlouhé ceny (od "Zdarma" po "12 345 Kč" + button/status).
  { width: 200, height: 48, glassThickness: 80, bezelWidth: 60 },
  { width: 240, height: 48, glassThickness: 80, bezelWidth: 60 },
  { width: 280, height: 48, glassThickness: 80, bezelWidth: 60 },
];

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

  useEffect(() => {
    prewarmLiquidGlass(LIQUID_GLASS_PREWARM);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SavedInzeratyProvider>
          <FilterStateProvider>
            <MaintenanceModal>{children}</MaintenanceModal>
          </FilterStateProvider>
        </SavedInzeratyProvider>
      </AuthProvider>
      <LiquidGlassPrewarm />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
