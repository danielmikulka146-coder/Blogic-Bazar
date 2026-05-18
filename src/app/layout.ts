import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Blogic",
    default: "Blogic",
  },
};

interface Props {
  children: ReactNode;
}

export default function RootLayout({ children }: Props) {
  return children;
}
