'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@ridendine/ui';

interface RawOffer {
  id: string;
  expires_at: string;
  delivery: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    estimated_distance_km: number | null;
    driver_payout: number | string;
  } | null;
}

interface DeliveryOffer {
  id: string;
  deliveryId: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  estimatedPayout: number;
  expiresAt: string;
}

interface OfferAlertProps {
  isOnline: boolean;
}

function mapRawOffer(raw: RawOffer): DeliveryOffer | null {
  if (!raw.delivery) return null;
  return {
    id: raw.id,
    deliveryId: raw.delivery.id,
    pickupAddress: raw.delivery.pickup_address,
    dropoffAddress: raw.delivery.dropoff_address,
    distanceKm: raw.delivery.estimated_distance_km ?? 0,
    estimatedPayout: Number(raw.delivery.driver_payout),
    expiresAt: raw.expires_at,
  };
}

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 350);
  } catch {
    // Audio not available
  }
}

function CountdownBadge({ secondsLeft }: { secondsLeft: number }) {
  const isUrgent = secondsLeft <= 15;
  return (
    <div
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        isUrgent
          ? 'bg-red-100 text-red-600 animate-pulse'
          : 'bg-orange-100 text-orange-600'
      }`}
    >
      {secondsLeft}s
    </div>
  );
}

function RouteDisplay({
  pickupAddress,
  dropoffAddress,
}: {
  pickupAddress: string;
  dropoffAddress: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
        <div>
          <p className="text-xs font-medium text-gray-500">PICKUP</p>
          <p className="text-sm font-medium text-gray-900">{pickupAddress}</p>
        </div>
      </div>
      <div className="ml-[5px] h-4 w-px bg-gray-200" />
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-red-500" />
        <div>
          <p className="text-xs font-medium text-gray-500">DROPOFF</p>
          <p className="text-sm font-medium text-gray-900">{dropoffAddress}</p>
        </div>
      </div>
    </div>
  );
}

function OfferStats({
  distanceKm,
  estimatedPayout,
}: {
  distanceKm: number;
  estimatedPayout: number;
}) {
  return (
    <div className="mt-4 flex justify-between rounded-xl bg-gray-50 p-3">
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900">{distanceKm.toFixed(1)} km</p>
        <p className="text-xs text-gray-500">Distance</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-green-600">${estimatedPayout.toFixed(2)}</p>
        <p className="text-xs text-gray-500">Earnings</p>
      </div>
    </div>
  );
}

export function OfferAlert({ isOnline }: OfferAlertProps) {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responding, setResponding] = useState(false);
  const hasPlayedSound = useRef(false);

  // Poll for offers every 5 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const poll = async () => {
      try {
        const res = await fetch('/api/offers');
        if (!res.ok) return;
        const data = await res.json();

        if (data.offers && data.offers.length > 0) {
          const raw: RawOffer = data.offers[0];
          const mapped = mapRawOffer(raw);
          if (!mapped) return;

          if (!offer || offer.id !== mapped.id) {
            setOffer(mapped);
            hasPlayedSound.current = false;
          }
        } else if (offer && !responding) {
          setOffer(null);
        }
      } catch {
        // Silent poll failure
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isOnline, offer, responding]);

  // Countdown timer and sound trigger
  useEffect(() => {
    if (!offer) return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) setOffer(null);
    };

    updateCountdown();

    if (!hasPlayedSound.current) {
      playAlertSound();
      hasPlayedSound.current = true;
    }

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const respond = async (action: 'accept' | 'decline') => {
    if (!offer) return;
    setResponding(true);

    try {
      await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: offer.id,
          action,
          ...(action === 'decline' ? { reason: 'driver_declined' } : {}),
        }),
      });

      if (action === 'accept') {
        window.location.href = `/delivery/${offer.deliveryId}`;
      }
    } catch (error) {
      console.error('Failed to respond to offer:', error);
    } finally {
      setOffer(null);
      setResponding(false);
    }
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Delivery!</h2>
          <CountdownBadge secondsLeft={secondsLeft} />
        </div>

        <RouteDisplay
          pickupAddress={offer.pickupAddress}
          dropoffAddress={offer.dropoffAddress}
        />

        <OfferStats
          distanceKm={offer.distanceKm}
          estimatedPayout={offer.estimatedPayout}
        />

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl py-3"
            onClick={() => respond('decline')}
            disabled={responding}
          >
            Decline
          </Button>
          <Button
            variant="success"
            className="flex-1 rounded-xl py-3"
            onClick={() => respond('accept')}
            disabled={responding}
          >
            {responding ? 'Accepting...' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
}
