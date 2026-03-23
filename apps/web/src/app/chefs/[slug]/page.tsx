import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/layout/header';
import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontMenu } from '@/components/storefront/storefront-menu';
import { createServerClient, getStorefrontBySlug, getMenuItemsByStorefront } from '@ridendine/db';

interface ChefPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChefPage({ params }: ChefPageProps) {
  const { slug } = await params;
  const cookieStore = cookies();
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
      <Header />

      <main>
        <StorefrontHeader storefront={storefrontData} />

        <div className="container py-8">
          <StorefrontMenu storefrontId={storefront.id} menuItems={menuItems} />
        </div>
      </main>
    </div>
  );
}
