import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * Nunito is the only family, matching the website exactly. It is variable, so one
 * file covers every weight — self-hosted by next/font, no request to Google.
 */
const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Pentagon International · Dashboard",
    template: "%s · Pentagon Dashboard",
  },
  description:
    "Manage rooms, offers, reservations and enquiries for Pentagon International Hotel and Suites.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
