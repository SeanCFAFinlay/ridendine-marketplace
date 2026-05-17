'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, type LiveIndicatorStatus } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

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
  driverId: string;
  isOnline: boolean;
  onChannelStatus?: (status: LiveIndicatorStatus) => void;
}

function mapBroadcastToOffer(payload: Record<string, unknown>): DeliveryOffer | null {
  const attemptId = typeof payload.attemptId === 'string' ? payload.attemptId : null;
  const deliveryId = typeof payload.deliveryId === 'string' ? payload.deliveryId : null;
  const expiresAt = typeof payload.expiresAt === 'string' ? payload.expiresAt : null;
  if (!attemptId || !deliveryId || !expiresAt) return null;
  const pickupAddress = typeof payload.pickupAddress === 'string' ? payload.pickupAddress : '';
  const dropoffAddress = typeof payload.dropoffAddress === 'string' ? payload.dropoffAddress : '';
  const distanceKm =
    typeof payload.estimatedDistanceKm === 'number' && Number.isFinite(payload.estimatedDistanceKm)
      ? payload.estimatedDistanceKm
      : 0;
  const estimatedPayout = Number(payload.estimatedPayout ?? 0);
  return {
    id: attemptId,
    deliveryId,
    pickupAddress,
    dropoffAddress,
    distanceKm,
    estimatedPayout,
    expiresAt,
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
          ? 'bg-dangerSoft text-danger animate-pulse'
          : 'bg-primarySoft text-primary'
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
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-success" />
        <div>
          <p className="text-xs font-medium text-textMuted">PICKUP</p>
          <p className="text-sm font-medium text-text">{pickupAddress}</p>
        </div>
      </div>
      <div className="ml-[5px] h-4 w-px bg-surfaceMuted" />
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-danger" />
        <div>
          <p className="text-xs font-medium text-textMuted">DROPOFF</p>
          <p className="text-sm font-medium text-text">{dropoffAddress}</p>
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
    <div className="mt-4 flex justify-between rounded-xl bg-surfaceMuted p-3">
      <div className="text-center">
        <p className="text-lg font-bold text-text">{distanceKm.toFixed(1)} km</p>
        <p className="text-xs text-textMuted">Distance</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-success">${estimatedPayout.toFixed(2)}</p>
        <p className="text-xs text-textMuted">Earnings</p>
      </div>
    </div>
  );
}

export function OfferAlert({ driverId, isOnline, onChannelStatus }: OfferAlertProps) {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responding, setResponding] = useState(false);
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (!isOnline || !driverId) return;

    const supabase = createBrowserClient();
    if (!supabase) return;

    const channelName = `driver:${driverId}:offers`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        const p = payload as Record<string, unknown>;
        const mapped = mapBroadcastToOffer(p);
        if (!mapped) return;
        setOffer((prev) => {
          if (prev?.id === mapped.id) return prev;
          hasPlayedSound.current = false;
          return mapped;
        });
      })
      .on('broadcast', { event: 'offer_expired' }, ({ payload }) => {
        const p = payload as Record<string, unknown>;
        const id = typeof p.attemptId === 'string' ? p.attemptId : null;
        setOffer((prev) => {
          if (!prev || !id || prev.id !== id) return prev;
          return null;
        });
      })
      .subscribe((status) => {
        onChannelStatus?.(status as unknown as LiveIndicatorStatus);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOnline, driverId, onChannelStatus]);

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
          driverId,
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
      if (action === 'decline') {
        setOffer(null);
      }
      setResponding(false);
    }
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text">New Delivery!</h2>
          <CountdownBadge secondsLeft={secondsLeft} />
        </div>

        <RouteDisplay pickupAddress={offer.pickupAddress} dropoffAddress={offer.dropoffAddress} />

        <OfferStats distanceKm={offer.distanceKm} estimatedPayout={offer.estimatedPayout} />

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
