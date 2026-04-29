'use client';

import { useState } from 'react';
import { Button, Card } from '@ridendine/ui';

interface ReviewFormProps {
  orderId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ orderId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a rating'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <div className="text-4xl mb-2">&#127881;</div>
        <h3 className="text-lg font-semibold text-gray-900">Thank you!</h3>
        <p className="mt-1 text-sm text-gray-600">Your review helps other customers and supports the chef.</p>
      </Card>
    );
  }

  const labels = ['', "We're sorry", 'Could be better', 'Thanks for the feedback', 'Glad you enjoyed it!', 'Amazing!'];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900">Rate your experience</h3>
      {error && <div className="mt-2 rounded-lg bg-red-50 p-3"><p className="text-sm text-red-800">{error}</p></div>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                className="text-3xl transition-transform hover:scale-110 focus:outline-none">
                {star <= (hoverRating || rating) ? '\u2B50' : '\u2606'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-gray-500">{labels[rating] || 'Tap a star to rate'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comments (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your meal..." rows={3} maxLength={500}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]" />
          <p className="mt-1 text-xs text-gray-400">{comment.length}/500</p>
        </div>
        <Button type="submit" disabled={loading || rating === 0} className="w-full">
          {loading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </Card>
  );
}
