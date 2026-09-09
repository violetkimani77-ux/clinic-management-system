import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hali CMS | Clinic Management System",
  description: "Hali CMS — a secure clinic management system for clinic teams.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
