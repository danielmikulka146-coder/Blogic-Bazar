const COUNTRY_CODE = {
  cz: "cz",
} as const;

export type CountryCode = (typeof COUNTRY_CODE)[keyof typeof COUNTRY_CODE];

export const COUNTRY_CODES: readonly CountryCode[] = ["cz"];
