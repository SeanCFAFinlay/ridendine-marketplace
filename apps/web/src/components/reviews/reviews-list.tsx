'use client';

import { useState, useEffect } from 'react';
import { Card } from '@ridendine/ui';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: { first_name: string; last_name: string } | null;
}

interface ReviewsListProps {
  storefrontId: string;
}

export function ReviewsList({ storefrontId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews?storefrontId=${storefrontId}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [storefrontId]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;

  if (reviews.length === 0) {
    return <Card className="p-6 text-center"><p className="text-gray-500">No reviews yet. Be the first!</p></Card>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex">{[1,2,3,4,5].map((s) => <span key={s} className="text-sm">{s <= review.rating ? '\u2B50' : '\u2606'}</span>)}</div>
              <span className="text-sm font-medium text-gray-900">
                {review.customer ? `${review.customer.first_name} ${review.customer.last_name?.charAt(0)}.` : 'Customer'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
          </div>
          {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
        </Card>
      ))}
    </div>
  );
}
