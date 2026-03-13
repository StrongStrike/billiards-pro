import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Billiards Pro Tashkent",
  description: "Rus billiard stollarini boshqarish uchun neon admin panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body
        suppressHydrationWarning
        className={`${headingFont.variable} ${bodyFont.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
