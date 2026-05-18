import { LOCALE_CODES, type LocaleCode } from "@/types/locale";

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && LOCALE_CODES.includes(value as LocaleCode);
}
