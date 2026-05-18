"use client";

import { useQuery } from "@tanstack/react-query";
import type { SystemSettingsResponse } from "@/app/api/system-settings/route";
import { QUERY_KEY } from "@/types/query";

const REFRESH_INTERVAL_MILLISECONDS = 15 * 1000;

export function useSystemSettings() {
  return useQuery({
    queryKey: QUERY_KEY.getSystemSettings(),
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/system-settings", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch system settings");
      }

      const data: SystemSettingsResponse = await response.json();
      return data;
    },
    staleTime: REFRESH_INTERVAL_MILLISECONDS,
    refetchInterval: REFRESH_INTERVAL_MILLISECONDS,
  });
}
