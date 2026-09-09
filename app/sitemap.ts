import type { MetadataRoute } from "next";

const siteUrl = "https://clinic-management-system-uwomgp4q3.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date("2026-09-09"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date("2026-09-09"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
