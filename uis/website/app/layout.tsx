import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "TrackFlow — Logistics that scales with your e-commerce",
  description:
    "TrackFlow is a binational (US & Spain) logistics company offering warehouse management, last-mile delivery, and reverse logistics for growing e-commerce businesses.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TrackFlow",
  description: "Warehouse management and last-mile deliveries for e-commerce",
  url: "https://trackflow.com",
  foundingDate: "2009",
  address: [
    {
      "@type": "PostalAddress",
      addressCountry: "US",
      addressLocality: "Los Angeles",
      addressRegion: "California",
    },
    {
      "@type": "PostalAddress",
      addressCountry: "ES",
      addressLocality: "Zaragoza",
      addressRegion: "Aragón",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-213-555-0147",
    contactType: "sales",
    availableLanguage: ["Spanish", "English"],
  },
  sameAs: ["https://linkedin.com/company/trackflow"],
  areaServed: [
    { "@type": "Country", name: "United States" },
    { "@type": "Country", name: "Spain" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="font-body min-h-full flex flex-col bg-paper text-slate">
        {children}
      </body>
    </html>
  );
}
