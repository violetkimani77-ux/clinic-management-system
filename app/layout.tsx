import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://clinic-management-system-uwomgp4q3.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hali CMS | Clinic Management System",
    template: "%s | Hali CMS",
  },
  description: "Hali CMS — a secure clinic management system for clinic teams.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Hali CMS",
    title: "Hali CMS | Clinic Management System",
    description: "Hali CMS — a secure clinic management system for clinic teams.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Hali CMS — Clinic Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hali CMS | Clinic Management System",
    description: "Hali CMS — a secure clinic management system for clinic teams.",
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
