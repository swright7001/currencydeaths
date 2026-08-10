import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "./convex-client-provider";
import { getOptionalConvexUrl } from "@/lib/env/convex";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CurrencyDeaths",
  description:
    "An educational monetary-history and purchasing-power research project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const convexUrl = getOptionalConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider url={convexUrl}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
