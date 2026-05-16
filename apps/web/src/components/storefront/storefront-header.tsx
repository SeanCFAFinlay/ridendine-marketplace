import { Badge } from '@ridendine/ui';

const TYPICAL_DRIVE_MINUTES = 15;
const DELIVERY_BUFFER_MINUTES = 5;

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

function computeDeliveryEta(prepMin: number, prepMax: number): { min: number; max: number } {
  return {
    min: prepMin + TYPICAL_DRIVE_MINUTES,
    max: prepMax + TYPICAL_DRIVE_MINUTES + DELIVERY_BUFFER_MINUTES,
  };
}

export function StorefrontHeader({ storefront }: StorefrontHeaderProps) {
  const deliveryEta = computeDeliveryEta(
    storefront.estimatedPrepTimeMin,
    storefront.estimatedPrepTimeMax
  );

  return (
    <div className="border-b border-border bg-surface">
      {/* Cover */}
      <div
        className="relative h-48 overflow-hidden bg-primarySoft md:h-64"
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
        <div className="absolute inset-0 bg-gradient-to-t from-text/30 to-transparent" />
      </div>

      <div className="container">
        <div className="-mt-16 flex flex-col gap-4 pb-6 md:-mt-20 md:flex-row md:items-end md:gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-primary text-3xl font-bold text-primaryFg shadow-lg md:h-32 md:w-32">
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
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text md:text-3xl">
              {storefront.name}
            </h1>
            <p className="mt-1 text-textMuted">
              by <span className="font-medium text-text">{storefront.chef.displayName}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {/* Rating */}
              {storefront.averageRating && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-warning" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-text">{Number(storefront.averageRating).toFixed(1)}</span>
                  <span className="text-textMuted">({storefront.totalReviews} reviews)</span>
                </div>
              )}

              {/* Delivery ETA */}
              <div className="flex items-center gap-1 text-textMuted">
                <svg className="h-4 w-4 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {deliveryEta.min}–{deliveryEta.max} min delivery
                  <span className="ml-1 text-xs text-textSubtle">
                    ({storefront.estimatedPrepTimeMin}–{storefront.estimatedPrepTimeMax} min prep)
                  </span>
                </span>
              </div>

              {/* Min Order */}
              {storefront.minOrderAmount > 0 && (
                <div className="flex items-center gap-1 text-textMuted">
                  <svg className="h-4 w-4 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                  <Badge key={cuisine} tone="accent" size="sm">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {storefront.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-textMuted">
                {storefront.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0 md:pb-0">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-textMuted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Add to favourites"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-textMuted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Share"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
