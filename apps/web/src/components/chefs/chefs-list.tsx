import Link from 'next/link';
import { Card, Avatar, Badge } from '@ridendine/ui';

// Placeholder data
const chefs = [
  {
    id: '1',
    slug: 'chef-maria',
    name: "Maria's Kitchen",
    chefName: 'Maria Garcia',
    cuisineTypes: ['Mexican', 'Latin'],
    averageRating: 4.8,
    totalReviews: 124,
    estimatedPrepTimeMin: 20,
    estimatedPrepTimeMax: 35,
  },
  {
    id: '2',
    slug: 'thai-home',
    name: 'Thai Home Cooking',
    chefName: 'Suda Patel',
    cuisineTypes: ['Thai', 'Asian'],
    averageRating: 4.9,
    totalReviews: 89,
    estimatedPrepTimeMin: 25,
    estimatedPrepTimeMax: 40,
  },
  {
    id: '3',
    slug: 'italian-nonna',
    name: "Nonna's Table",
    chefName: 'Rosa Lombardi',
    cuisineTypes: ['Italian', 'Mediterranean'],
    averageRating: 4.7,
    totalReviews: 156,
    estimatedPrepTimeMin: 30,
    estimatedPrepTimeMax: 45,
  },
  {
    id: '4',
    slug: 'soul-kitchen',
    name: 'Soul Kitchen',
    chefName: 'James Washington',
    cuisineTypes: ['Southern', 'American'],
    averageRating: 4.6,
    totalReviews: 78,
    estimatedPrepTimeMin: 25,
    estimatedPrepTimeMax: 40,
  },
];

export function ChefsList() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {chefs.map((chef) => (
        <Link key={chef.id} href={`/chefs/${chef.slug}`}>
          <Card className="h-full overflow-hidden transition-shadow hover:shadow-md" padding="none">
            <div className="h-32 bg-gradient-to-br from-brand-100 to-brand-200" />
            <div className="p-4">
              <div className="-mt-12 mb-3 flex items-end gap-3">
                <Avatar
                  alt={chef.name}
                  fallback={chef.name}
                  size="lg"
                  className="border-4 border-white"
                />
                <div className="mb-1 flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{chef.averageRating}</span>
                  <span className="text-sm text-gray-500">({chef.totalReviews})</span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{chef.name}</h3>
              <p className="text-sm text-gray-500">by {chef.chefName}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {chef.cuisineTypes.map((cuisine) => (
                  <Badge key={cuisine} variant="default">{cuisine}</Badge>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {chef.estimatedPrepTimeMin}-{chef.estimatedPrepTimeMax} min
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
