import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@mantine/core/styles.css";
import "./globals.css";

const jbMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jb-mono",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Blogic",
    default: "Blogic",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" {...mantineHtmlProps} className={jbMono.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" forceColorScheme="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}
