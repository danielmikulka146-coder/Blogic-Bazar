"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export function PageLogo() {
  const t = useTranslations();

  return <Image src="/blogic-logo.png" alt={t("common.pageLogo.ariaLabel")} width={115} height={46} />;
}
