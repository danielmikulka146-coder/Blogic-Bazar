import { defineRouting } from "next-intl/routing";
import { LOCALE_CODES } from "@/types/locale";

export const routing = defineRouting({
  locales: LOCALE_CODES,
  defaultLocale: "cs",
});
