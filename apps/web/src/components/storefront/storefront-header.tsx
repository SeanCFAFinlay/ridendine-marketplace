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
    <div className="bg-white border-b border-gray-100">
      {/* Cover Image */}
      <div
        className="h-48 bg-gradient-to-br from-[#fff0e8] to-[#fde8d8] md:h-64 relative overflow-hidden"
        style={
          storefront.coverImageUrl
            ? {
                backgroundImage: `url(${storefront.coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="container">
        <div className="-mt-16 flex flex-col gap-4 pb-6 md:-mt-20 md:flex-row md:items-end md:gap-6">
          {/* Logo / Avatar */}
          <div className="h-24 w-24 rounded-2xl border-4 border-white bg-[#E85D26] flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden flex-shrink-0 md:h-32 md:w-32">
            {storefront.logoUrl ? (
              <img
                src={storefront.logoUrl}
                alt={storefront.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              storefront.name.charAt(0)
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {storefront.name}
            </h1>
            <p className="mt-1 text-gray-600">
              by <span className="font-medium text-gray-800">{storefront.chef.displayName}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {/* Rating */}
              {storefront.averageRating && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-gray-900">{Number(storefront.averageRating).toFixed(1)}</span>
                  <span className="text-gray-500">({storefront.totalReviews} reviews)</span>
                </div>
              )}

              {/* Prep Time */}
              <div className="flex items-center gap-1 text-gray-500">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{storefront.estimatedPrepTimeMin}–{storefront.estimatedPrepTimeMax} min prep</span>
              </div>

              {/* Min Order */}
              {storefront.minOrderAmount > 0 && (
                <div className="flex items-center gap-1 text-gray-500">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Min. ${Number(storefront.minOrderAmount).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Cuisine Tags */}
            {storefront.cuisineTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {storefront.cuisineTypes.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-medium text-[#E85D26]"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {storefront.description && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-2xl">
                {storefront.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0 md:pb-0">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-[#E85D26] hover:text-[#E85D26]"
              aria-label="Add to favourites"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-[#E85D26] hover:text-[#E85D26]"
              aria-label="Share"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
