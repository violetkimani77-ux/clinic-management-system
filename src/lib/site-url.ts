const normalizeSiteUrl = (value: string) => {
  const normalized = value.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
};

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeSiteUrl(configured);

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return normalizeSiteUrl(productionUrl);

  return "http://localhost:3000";
}
