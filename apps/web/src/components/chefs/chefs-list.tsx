import Link from 'next/link';
import { cookies } from 'next/headers';
import { Card, Avatar, Badge } from '@ridendine/ui';
import { createServerClient, getActiveStorefronts } from '@ridendine/db';

export async function ChefsList() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  let chefs: Awaited<ReturnType<typeof getActiveStorefronts>> = [];

  try {
    chefs = await getActiveStorefronts(supabase as any, { limit: 20 });
  } catch (error) {
    console.error('Failed to fetch chefs:', error);
  }

  if (chefs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No chefs available at the moment. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {chefs.map((chef) => (
        <Link key={chef.id} href={`/chefs/${chef.slug}`}>
          <Card className="h-full overflow-hidden transition-shadow hover:shadow-md" padding="none">
            <div
              className="h-32 bg-gradient-to-br from-brand-100 to-brand-200"
              style={chef.cover_image_url ? { backgroundImage: `url(${chef.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            <div className="p-4">
              <div className="-mt-12 mb-3 flex items-end gap-3">
                <Avatar
                  src={chef.logo_url}
                  alt={chef.name}
                  fallback={chef.name}
                  size="lg"
                  className="border-4 border-white"
                />
                <div className="mb-1 flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{chef.average_rating?.toFixed(1) || 'New'}</span>
                  {chef.total_reviews > 0 && (
                    <span className="text-sm text-gray-500">({chef.total_reviews})</span>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{chef.name}</h3>
              <p className="text-sm text-gray-500">by {chef.chef_profiles?.display_name || 'Chef'}</p>
              {chef.cuisine_types && chef.cuisine_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {chef.cuisine_types.slice(0, 3).map((cuisine) => (
                    <Badge key={cuisine} variant="default">{cuisine}</Badge>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm text-gray-500">
                {chef.estimated_prep_time_min || 15}-{chef.estimated_prep_time_max || 45} min
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
