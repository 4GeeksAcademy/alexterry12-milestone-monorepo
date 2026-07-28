import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { SidebarNav } from "@/components/SidebarNav";
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
        <div className="flex min-h-screen">
          <aside className="flex w-60 shrink-0 flex-col bg-ink text-surface">
            <div className="border-b border-white/10 px-5 py-6">
              <p className="font-mono text-xs tracking-widest text-accent uppercase">
                TrackFlow
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                Backoffice
              </p>
            </div>
            <SidebarNav />
            <div className="border-t border-white/10 px-5 py-4">
              <p className="font-mono text-xs text-surface/50">Internal only</p>
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-line bg-surface px-8 py-4">
              <p className="text-sm text-muted">Operations console</p>
            </header>
            <main className="flex-1 px-8 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
