'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
  } | null;
  order: {
    order_number: string;
  } | null;
  chef_response: string | null;
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ average: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: chefProfile } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null };

      if (!chefProfile) return;

      const { data: storefront } = await supabase
        .from('chef_storefronts')
        .select('id, average_rating, total_reviews')
        .eq('chef_id', chefProfile.id)
        .single() as { data: { id: string; average_rating: number | null; total_reviews: number | null } | null };

      if (!storefront) return;

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          chef_response,
          customers (first_name, last_name),
          orders (order_number)
        `)
        .eq('storefront_id', storefront.id)
        .order('created_at', { ascending: false }) as { data: any[] | null };

      if (reviewsData) {
        const mappedReviews = reviewsData.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          chef_response: r.chef_response,
          customer: r.customers,
          order: r.orders,
        }));

        setReviews(mappedReviews);

        // Calculate distribution
        const distribution = [0, 0, 0, 0, 0];
        for (const r of mappedReviews) {
          const index = r.rating - 1;
          if (index >= 0 && index < 5 && distribution[index] !== undefined) {
            distribution[index] = distribution[index] + 1;
          }
        }

        setStats({
          average: storefront.average_rating || 0,
          total: storefront.total_reviews || 0,
          distribution,
        });
      }

      setLoading(false);
    }

    fetchReviews();
  }, [supabase]);

  const handleRespond = async (reviewId: string) => {
    if (!response.trim()) return;

    setSubmitting(true);

    const { error } = await (supabase as any)
      .from('reviews')
      .update({ chef_response: response })
      .eq('id', reviewId);

    if (!error) {
      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, chef_response: response } : r
      ));
      setRespondingTo(null);
      setResponse('');
    }

    setSubmitting(false);
  };

  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === parseInt(filter));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="mt-2 h-8 w-16 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-gray-500">See what your customers are saying</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-4xl font-bold text-[#E85D26]">{stats.average.toFixed(1)}</p>
          <div className="mt-1 text-xl">{renderStars(Math.round(stats.average))}</div>
          <p className="mt-2 text-sm text-gray-500">Average Rating</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
          <p className="mt-2 text-sm text-gray-500">Total Reviews</p>
        </Card>
        <Card>
          <p className="font-medium text-gray-900 mb-3">Rating Distribution</p>
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2 mb-1">
              <span className="text-sm w-3">{rating}</span>
              <span className="text-yellow-400">★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400"
                  style={{
                    width: stats.total > 0
                      ? `${((stats.distribution[rating - 1] ?? 0) / stats.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <span className="text-sm text-gray-500 w-8">{stats.distribution[rating - 1] ?? 0}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', '5', '4', '3', '2', '1'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Reviews' : `${f} Stars`}
          </Button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-gray-500">
              No {filter === 'all' ? '' : `${filter}-star `}reviews yet
            </p>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{renderStars(review.rating)}</span>
                    <Badge variant={review.rating >= 4 ? 'success' : review.rating >= 3 ? 'warning' : 'error'}>
                      {review.rating}/5
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">
                    {review.customer
                      ? `${review.customer.first_name} ${review.customer.last_name}`
                      : 'Anonymous'}
                  </p>
                  {review.order && (
                    <p className="text-sm text-gray-500">Order: {review.order.order_number}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>

              {review.comment && (
                <p className="mt-3 text-gray-700">{review.comment}</p>
              )}

              {review.chef_response ? (
                <div className="mt-4 rounded-lg bg-orange-50 p-4">
                  <p className="text-sm font-medium text-[#E85D26]">Your Response:</p>
                  <p className="mt-1 text-sm text-gray-700">{review.chef_response}</p>
                </div>
              ) : (
                <div className="mt-4">
                  {respondingTo === review.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Write your response..."
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponse('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespond(review.id)}
                          disabled={submitting || !response.trim()}
                        >
                          {submitting ? 'Sending...' : 'Send Response'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      Respond to Review
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
