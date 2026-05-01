'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@ridendine/ui';
import { orderConfirmationPath } from '@/lib/customer-ordering';

interface StripePaymentFormProps {
  orderId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripePaymentForm({ orderId, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${orderConfirmationPath(orderId)}`,
      },
    });

    if (error) {
      onError(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? 'Processing...' : 'Place Order'}
      </Button>
    </form>
  );
}
