import type { MetadataRoute } from 'next';
import { createAdminClient, getActiveStorefronts } from '@ridendine/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca';
  const client = createAdminClient();

  let storefronts: Array<{ slug: string; updated_at?: string }> = [];
  try {
    storefronts = await getActiveStorefronts(client as any);
  } catch {
    // Fallback to empty
  }

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/chefs`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  const chefPages = storefronts.map((s) => ({
    url: `${baseUrl}/chefs/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...chefPages];
}
