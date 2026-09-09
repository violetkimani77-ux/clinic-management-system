import type { MetadataRoute } from "next";

const siteUrl = "https://clinic-management-system-uwomgp4q3.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
