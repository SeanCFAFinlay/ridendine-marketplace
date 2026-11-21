'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  chef_response: string | null;
  chef_responded_at: string | null;
  customer_name: string | null;
  order_number: string | null;
}

type Filter = 'all' | 'unanswered' | '5' | '4' | '3' | '2' | '1';

const MAX_RESPONSE_LENGTH = 1000;

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <span key={i} className={i < rating ? 'text-warning' : 'text-textSubtle'}>
      ★
    </span>
  ));
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? fallback;
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error(await readError(res, 'Could not load reviews'));
      const json = await res.json();
      setReviews(json.data?.reviews ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const stats = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of reviews) {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < 5) distribution[idx] = (distribution[idx] ?? 0) + 1;
      sum += r.rating;
    }
    const total = reviews.length;
    return {
      total,
      average: total > 0 ? sum / total : 0,
      distribution,
      unanswered: reviews.filter((r) => !r.chef_response).length,
    };
  }, [reviews]);

  const startEditing = (review: Review) => {
    setEditingId(review.id);
    setDraft(review.chef_response ?? '');
    setActionError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft('');
    setActionError(null);
  };

  const applyUpdate = (reviewId: string, data: { chef_response: string | null; chef_responded_at: string | null }) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...data } : r)));
  };

  const saveResponse = async (reviewId: string) => {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: text }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not save your reply'));
      const json = await res.json();
      applyUpdate(reviewId, json.data);
      cancelEditing();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save your reply');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteResponse = async (reviewId: string) => {
    if (!window.confirm('Remove your reply? Customers will no longer see it.')) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res, 'Could not remove your reply'));
      const json = await res.json();
      applyUpdate(reviewId, json.data);
      cancelEditing();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove your reply');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'unanswered') return !r.chef_response;
    return r.rating === parseInt(filter, 10);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">Reviews</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-24 rounded bg-surfaceMuted" />
              <div className="mt-2 h-8 w-16 rounded bg-surfaceMuted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">Reviews</h1>
        <Card>
          <p className="py-6 text-center text-sm text-danger">{loadError}</p>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={fetchReviews}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Reviews</h1>
        <p className="mt-1 text-textMuted">
          See what customers are saying and reply. Your replies appear publicly on your storefront.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-4xl font-bold text-primary">{stats.average.toFixed(1)}</p>
          <div className="mt-1 text-xl">{renderStars(Math.round(stats.average))}</div>
          <p className="mt-2 text-sm text-textMuted">
            Average rating · {stats.total} review{stats.total === 1 ? '' : 's'}
          </p>
        </Card>
        <Card className="text-center">
          <p className={`text-4xl font-bold ${stats.unanswered > 0 ? 'text-warning' : 'text-success'}`}>
            {stats.unanswered}
          </p>
          <p className="mt-2 text-sm text-textMuted">Waiting for your reply</p>
        </Card>
        <Card>
          <p className="mb-3 font-medium text-text">Rating Distribution</p>
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="mb-1 flex items-center gap-2">
              <span className="w-3 text-sm">{rating}</span>
              <span className="text-warning">★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surfaceMuted">
                <div
                  className="h-full bg-warning"
                  style={{
                    width:
                      stats.total > 0
                        ? `${((stats.distribution[rating - 1] ?? 0) / stats.total) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <span className="w-8 text-sm text-textMuted">{stats.distribution[rating - 1] ?? 0}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'unanswered', '5', '4', '3', '2', '1'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all'
              ? 'All Reviews'
              : f === 'unanswered'
                ? `Needs Reply (${stats.unanswered})`
                : `${f} Stars`}
          </Button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-textMuted">
              {filter === 'unanswered'
                ? "You're all caught up — every review has a reply."
                : `No ${filter === 'all' ? '' : `${filter}-star `}reviews yet`}
            </p>
          </Card>
        ) : (
          filteredReviews.map((review) => {
            const isEditing = editingId === review.id;
            return (
              <Card key={review.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{renderStars(review.rating)}</span>
                      <Badge variant={review.rating >= 4 ? 'success' : review.rating >= 3 ? 'warning' : 'error'}>
                        {review.rating}/5
                      </Badge>
                      {!review.chef_response && <Badge variant="warning">Needs reply</Badge>}
                    </div>
                    <p className="mt-1 font-medium text-text">{review.customer_name ?? 'Customer'}</p>
                    {review.order_number && (
                      <p className="text-sm text-textMuted">Order: {review.order_number}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-textMuted">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {review.comment ? (
                  <p className="mt-3 text-text">{review.comment}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-textMuted">No written comment</p>
                )}

                {isEditing ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, MAX_RESPONSE_LENGTH))}
                      placeholder="Thank the customer, or address their feedback…"
                      aria-label="Your reply"
                      className="w-full rounded-lg border border-borderStrong p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-textSubtle">
                        {draft.length}/{MAX_RESPONSE_LENGTH} · visible on your storefront
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditing} disabled={submitting}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveResponse(review.id)}
                          disabled={submitting || !draft.trim()}
                        >
                          {submitting ? 'Saving…' : review.chef_response ? 'Save Changes' : 'Post Reply'}
                        </Button>
                      </div>
                    </div>
                    {actionError && <p className="text-sm text-danger">{actionError}</p>}
                  </div>
                ) : review.chef_response ? (
                  <div className="mt-4 rounded-lg bg-primarySoft p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-primary">
                        Your reply
                        {review.chef_responded_at && (
                          <span className="ml-2 font-normal text-textMuted">
                            {new Date(review.chef_responded_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      <div className="flex gap-3 text-xs font-medium">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => startEditing(review)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-danger hover:underline disabled:opacity-50"
                          onClick={() => deleteResponse(review.id)}
                          disabled={submitting}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-text">{review.chef_response}</p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => startEditing(review)}>
                      Reply
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
