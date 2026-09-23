import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { AuthGuard } from "@/components/AuthGuard";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "TrackFlow Backoffice",
  description: "Internal operations dashboard for TrackFlow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
