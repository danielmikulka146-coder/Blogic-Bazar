import { COUNTRY_CODES, type CountryCode } from "@/types/country";

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && COUNTRY_CODES.includes(value as CountryCode);
}
