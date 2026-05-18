export const QUERY_KEY = {
  all: "all",
  getSystemSettings: () => [QUERY_KEY.all, "get-system-settings"] as const,
} as const;
