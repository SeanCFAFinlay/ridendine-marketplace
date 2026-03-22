import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontMenu } from '@/components/storefront/storefront-menu';

interface ChefPageProps {
  params: Promise<{ slug: string }>;
}

interface StorefrontData {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  cuisineTypes: string[];
  averageRating?: number | null;
  totalReviews: number;
  estimatedPrepTimeMin: number;
  estimatedPrepTimeMax: number;
  minOrderAmount: number;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  chef: {
    id: string;
    displayName: string;
    profileImageUrl?: string | null;
  };
}

// Placeholder data - will be replaced with real data from Supabase
async function getStorefront(slug: string): Promise<StorefrontData | null> {
  // Simulated API call
  const storefronts: Record<string, StorefrontData> = {
    'chef-maria': {
      id: '1',
      slug: 'chef-maria',
      name: "Maria's Kitchen",
      description: 'Authentic Mexican cuisine made with love and traditional family recipes passed down through generations.',
      cuisineTypes: ['Mexican', 'Latin'],
      averageRating: 4.8,
      totalReviews: 124,
      estimatedPrepTimeMin: 20,
      estimatedPrepTimeMax: 35,
      minOrderAmount: 15,
      coverImageUrl: null,
      logoUrl: null,
      chef: {
        id: 'c1',
        displayName: 'Maria Garcia',
        profileImageUrl: null,
      },
    },
  };

  return storefronts[slug] || null;
}

export default async function ChefPage({ params }: ChefPageProps) {
  const { slug } = await params;
  const storefront = await getStorefront(slug);

  if (!storefront) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        <StorefrontHeader storefront={storefront} />

        <div className="container py-8">
          <StorefrontMenu storefrontId={storefront.id} />
        </div>
      </main>
    </div>
  );
}
