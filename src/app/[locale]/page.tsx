import { getTranslations } from "next-intl/server";
import { HeaderSearch } from "@/components/layout/Header";

export async function generateMetadata() {
  const t = await getTranslations();

  return {
    title: t("page.home.title"),
    description: t("page.home.description"),
  };
}

export default async function Page(_: PageProps<"/[locale]">) {
  return <HeaderSearch />;
}
