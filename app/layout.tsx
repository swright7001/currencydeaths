import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConvexClientProvider } from "./convex-client-provider";
import { getOptionalConvexUrl } from "@/lib/env/convex";
import "./globals.css";

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Roboto_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "CurrencyDeaths",
  description:
    "An educational monetary-history and purchasing-power research project.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  const convexUrl = getOptionalConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ConvexClientProvider url={convexUrl}>
          <div className="site-frame">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
