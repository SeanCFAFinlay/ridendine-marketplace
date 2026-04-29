import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/layout/header';
import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontMenu } from '@/components/storefront/storefront-menu';
import { createServerClient, getStorefrontBySlug, getMenuItemsByStorefront } from '@ridendine/db';
import { ReviewsList } from '@/components/reviews/reviews-list';

interface ChefPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ChefPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const storefront = await getStorefrontBySlug(supabase as any, slug);

  if (!storefront) {
    return { title: 'Chef Not Found - RideNDine' };
  }

  const title = `${storefront.name} - Order from ${storefront.chef_profiles?.display_name || 'Chef'} | RideNDine`;
  const description = storefront.description
    || `Order delicious ${(storefront.cuisine_types || []).join(', ')} food from ${storefront.name} on RideNDine. Chef-made meals delivered to your door.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'RideNDine',
      images: storefront.cover_image_url ? [{ url: storefront.cover_image_url, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: storefront.cover_image_url ? [storefront.cover_image_url] : [],
    },
  };
}

export default async function ChefPage({ params }: ChefPageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const storefront = await getStorefrontBySlug(supabase as any, slug);

  if (!storefront) {
    notFound();
  }

  // Fetch menu items
  let menuItems: Awaited<ReturnType<typeof getMenuItemsByStorefront>> = [];
  try {
    menuItems = await getMenuItemsByStorefront(supabase as any, storefront.id);
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
  }

  // Transform to expected format
  const storefrontData = {
    id: storefront.id,
    slug: storefront.slug,
    name: storefront.name,
    description: storefront.description,
    cuisineTypes: storefront.cuisine_types || [],
    averageRating: storefront.average_rating,
    totalReviews: storefront.total_reviews || 0,
    estimatedPrepTimeMin: storefront.estimated_prep_time_min || 15,
    estimatedPrepTimeMax: storefront.estimated_prep_time_max || 45,
    minOrderAmount: storefront.min_order_amount || 0,
    coverImageUrl: storefront.cover_image_url,
    logoUrl: storefront.logo_url,
    chef: {
      id: storefront.chef_profiles?.id || '',
      displayName: storefront.chef_profiles?.display_name || 'Chef',
      profileImageUrl: storefront.chef_profiles?.profile_image_url,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Restaurant',
            name: storefrontData.name,
            description: storefrontData.description,
            servesCuisine: storefrontData.cuisineTypes,
            aggregateRating: storefrontData.averageRating ? {
              '@type': 'AggregateRating',
              ratingValue: storefrontData.averageRating,
              reviewCount: storefrontData.totalReviews,
            } : undefined,
            image: storefrontData.coverImageUrl,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca'}/chefs/${slug}`,
          }),
        }}
      />
      <Header />

      <main>
        <StorefrontHeader storefront={storefrontData} />

        <div className="container py-8">
          <StorefrontMenu storefrontId={storefront.id} menuItems={menuItems} />
        </div>

        <div className="container py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
          <ReviewsList storefrontId={storefront.id} />
        </div>
      </main>
    </div>
  );
}
