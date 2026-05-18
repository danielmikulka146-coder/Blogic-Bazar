import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
  });

  return {
    name: t("page.home.title"),
    description: t("page.home.description"),
    start_url: "/",
  };
}
