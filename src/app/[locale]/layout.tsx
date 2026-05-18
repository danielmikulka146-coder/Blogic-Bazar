import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Providers } from "@/components/infrastructure/Providers";
import { PageLayout } from "@/components/layout/PageLayout";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <MantineProvider>
            <ModalsProvider>
              <Providers>
                <PageLayout>{children}</PageLayout>
              </Providers>
            </ModalsProvider>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
