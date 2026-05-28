import { createTheme, type MantineColorsTuple, MantineProvider } from "@mantine/core";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Providers } from "@/components/infrastructure/Providers";
import { PageLayout } from "@/components/layout/PageLayout";
import { routing } from "@/i18n/routing";

const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

const brandOrange: MantineColorsTuple = [
  "#fff3ee",
  "#ffe1d3",
  "#ffc1a6",
  "#ff9f75",
  "#ff824c",
  "#ff6f32",
  "#FF5722",
  "#e84812",
  "#cc3d0d",
  "#b5350a",
];

const theme = createTheme({
  primaryColor: "brand",
  defaultRadius: 0,
  radius: { xs: "0", sm: "0", md: "0", lg: "0", xl: "0" },
  colors: {
    brand: brandOrange,
  },
  fontFamily: MONO_STACK,
  fontFamilyMonospace: MONO_STACK,
  headings: {
    fontFamily: MONO_STACK,
  },
});

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <NextIntlClientProvider>
      <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme="light">
        <Providers>
          <PageLayout>{children}</PageLayout>
        </Providers>
      </MantineProvider>
    </NextIntlClientProvider>
  );
}
