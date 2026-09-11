import type { Metadata } from "next";
import "./globals.css";
import "./responsive.css";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
  openGraph: {
    type: "website",
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
