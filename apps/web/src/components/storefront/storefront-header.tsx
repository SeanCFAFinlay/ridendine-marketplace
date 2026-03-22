import { Avatar, Badge, Button } from '@ridendine/ui';

interface StorefrontHeaderProps {
  storefront: {
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
      displayName: string;
      profileImageUrl?: string | null;
    };
  };
}

export function StorefrontHeader({ storefront }: StorefrontHeaderProps) {
  return (
    <div>
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-brand-200 to-brand-300 md:h-64" />

      <div className="container">
        <div className="-mt-16 flex flex-col gap-4 md:-mt-20 md:flex-row md:items-end md:gap-6">
          {/* Logo */}
          <Avatar
            src={storefront.logoUrl}
            alt={storefront.name}
            fallback={storefront.name}
            size="xl"
            className="h-24 w-24 border-4 border-white md:h-32 md:w-32"
          />

          {/* Info */}
          <div className="flex-1 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {storefront.name}
            </h1>
            <p className="mt-1 text-gray-600">
              by {storefront.chef.displayName}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {/* Rating */}
              {storefront.averageRating && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{storefront.averageRating}</span>
                  <span className="text-gray-500">({storefront.totalReviews} reviews)</span>
                </div>
              )}

              {/* Prep Time */}
              <div className="flex items-center gap-1 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{storefront.estimatedPrepTimeMin}-{storefront.estimatedPrepTimeMax} min</span>
              </div>

              {/* Min Order */}
              <div className="text-gray-500">
                Min. ${storefront.minOrderAmount.toFixed(2)}
              </div>
            </div>

            {/* Cuisine Tags */}
            <div className="mt-3 flex flex-wrap gap-2">
              {storefront.cuisineTypes.map((cuisine) => (
                <Badge key={cuisine} variant="primary">
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-4">
            <Button variant="outline" size="icon">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Button>
            <Button variant="outline" size="icon">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Description */}
        {storefront.description && (
          <p className="mt-4 text-gray-600">{storefront.description}</p>
        )}
      </div>
    </div>
  );
}
