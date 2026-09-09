import type { Metadata } from "next";
import "./globals.css";
import "./responsive.css";

const productionUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? `https://${process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}`
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: {
    default: "Heri CMS | Clinic Management System",
    template: "%s | Heri CMS",
  },
  description:
    "Heri CMS is a secure clinic management system for patient care, visits, pharmacy, accounts and reporting workflows.",
  keywords: [
    "clinic management system",
    "clinic management software",
    "healthcare management system",
    "patient management",
    "pharmacy management",
    "clinic reporting",
    "Heri CMS",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Heri CMS",
    title: "Heri CMS | Clinic Management System",
    description:
      "A secure clinic management system for patient care, visits, pharmacy, accounts and reporting workflows.",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Heri CMS — Clinic Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Heri CMS | Clinic Management System",
    description:
      "A secure clinic management system for patient care, visits, pharmacy, accounts and reporting workflows.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
