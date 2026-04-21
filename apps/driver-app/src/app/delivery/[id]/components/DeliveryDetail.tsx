'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';
import { useLocationTracker } from '@/hooks/use-location-tracker';

type DeliveryStatus = 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'picked_up' | 'en_route_to_dropoff' | 'arrived_at_dropoff';

interface DeliveryDetailProps {
  delivery: Delivery;
  order: DeliveryOrder | null;
}

interface DeliveryOrder {
  order_number: string;
  special_instructions?: string | null;
  customer_phone?: string | null;
}

type DeliveryWithContact = Delivery & {
  pickup_phone?: string | null;
  driver_tip?: number | null;
};

export default function DeliveryDetail({ delivery, order }: DeliveryDetailProps) {
  const deliveryWithContact = delivery as DeliveryWithContact;
  const router = useRouter();
  const [status, setStatus] = useState<DeliveryStatus>(delivery.status as DeliveryStatus);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Location tracking
  useLocationTracker({
    driverId: delivery.driver_id || '',
    isOnline: true,
    updateInterval: 15000,
  });

  const getStatusSteps = () => {
    const steps = [
      { id: 'accepted', label: 'Accepted' },
      { id: 'en_route_to_pickup', label: 'En Route to Pickup' },
      { id: 'arrived_at_pickup', label: 'At Restaurant' },
      { id: 'picked_up', label: 'Picked Up' },
      { id: 'en_route_to_dropoff', label: 'En Route to Customer' },
      { id: 'arrived_at_dropoff', label: 'At Customer' },
    ];
    const currentIndex = steps.findIndex((s) => s.id === status);
    return steps.map((step, i) => ({
      ...step,
      completed: i < currentIndex,
      current: i === currentIndex,
    }));
  };

  const getNextAction = (): { label: string; nextStatus: DeliveryStatus } | null => {
    const actions: Record<DeliveryStatus, { label: string; nextStatus: DeliveryStatus } | null> = {
      accepted: { label: 'Start Navigation to Pickup', nextStatus: 'en_route_to_pickup' },
      en_route_to_pickup: { label: 'Arrived at Restaurant', nextStatus: 'arrived_at_pickup' },
      arrived_at_pickup: { label: 'Confirm Pickup', nextStatus: 'picked_up' },
      picked_up: { label: 'Start Navigation to Customer', nextStatus: 'en_route_to_dropoff' },
      en_route_to_dropoff: { label: 'Arrived at Customer', nextStatus: 'arrived_at_dropoff' },
      arrived_at_dropoff: null,
    };
    return actions[status];
  };

  // Open Google Maps navigation
  const openNavigation = (address: string, lat?: number | null, lng?: number | null) => {
    let url: string;

    if (lat && lng) {
      // Use coordinates if available
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    } else {
      // Fall back to address
      const encodedAddress = encodeURIComponent(address);
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
    }

    // Try to open in Google Maps app on mobile
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `google.navigation:q=${lat},${lng}`;
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      setTimeout(() => {
        window.open(url, '_blank');
      }, 500);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleAction = async () => {
    const action = getNextAction();
    if (!action) return;

    // If starting navigation, open maps first
    if (action.nextStatus === 'en_route_to_pickup') {
      openNavigation(delivery.pickup_address, delivery.pickup_lat, delivery.pickup_lng);
    } else if (action.nextStatus === 'en_route_to_dropoff') {
      openNavigation(delivery.dropoff_address, delivery.dropoff_lat, delivery.dropoff_lng);
    }

    try {
      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery status');
      }

      setStatus(action.nextStatus);
      router.refresh();
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Failed to update delivery status');
    }
  };

  // Photo capture
  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Signature canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showCompletionModal) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, [showCompletionModal]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL('image/png'));
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleComplete = async () => {
    setIsUploading(true);

    try {
      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: 'delivered',
          proofUrl: photo,
          notes: signature ? 'Signature captured' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete delivery');
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to complete delivery');
    } finally {
      setIsUploading(false);
    }
  };

  const steps = getStatusSteps();
  const action = getNextAction();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="bg-brand-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium opacity-90">Active Delivery</p>
            <p className="mt-1 text-[20px] font-bold tracking-tight">
              {order?.order_number ?? 'Loading...'}
            </p>
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2">
            <p className="text-[18px] font-bold">${delivery.driver_payout.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  step.completed ? 'bg-[#22c55e]' : step.current ? 'bg-brand-500' : 'bg-[#e5e7eb]'
                }`}
              />
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${step.completed ? 'bg-[#22c55e]' : 'bg-[#e5e7eb]'}`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[14px] font-semibold text-[#1a1a1a]">
          {steps.find((s) => s.current)?.label}
        </p>
      </div>

      {/* Navigation Button */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full rounded-lg border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={() => {
            const isPickup = status.includes('pickup') || status === 'accepted';
            if (isPickup) {
              openNavigation(delivery.pickup_address, delivery.pickup_lat, delivery.pickup_lng);
            } else {
              openNavigation(delivery.dropoff_address, delivery.dropoff_lat, delivery.dropoff_lng);
            }
          }}
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open in Google Maps
        </Button>
      </div>

      {/* Destination Card */}
      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          {status.includes('pickup') || status === 'accepted' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
                <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Pickup</h3>
              </div>
              <p className="mt-3 text-[15px] font-medium text-[#1a1a1a]">Restaurant Location</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                {delivery.pickup_address}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={() => window.open(`tel:${deliveryWithContact.pickup_phone || ''}`, '_self')}
              >
                Call Restaurant
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
                <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Dropoff</h3>
              </div>
              <p className="mt-3 text-[15px] font-medium text-[#1a1a1a]">Customer</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                {delivery.dropoff_address}
              </p>
              {order?.special_instructions && (
                <div className="mt-4 rounded-lg bg-[#fef3c7] p-4">
                  <p className="text-[14px] leading-relaxed text-[#92400e]">
                    Note: {order.special_instructions}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={() => window.open(`tel:${order?.customer_phone || ''}`, '_self')}
              >
                Call Customer
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Order Details */}
      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Order Details</h3>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Distance</span>
              <span className="font-medium text-[#1a1a1a]">
                {delivery.distance_km?.toFixed(1) ?? '—'} km
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Delivery Fee</span>
              <span className="font-medium text-[#1a1a1a]">
                ${delivery.delivery_fee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Tip</span>
              <span className="font-medium text-[#1a1a1a]">
                ${(deliveryWithContact.driver_tip || 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Your Earnings</span>
              <span className="font-semibold text-[#22c55e]">
                ${delivery.driver_payout.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
        {status === 'arrived_at_dropoff' ? (
          <Button
            className="w-full rounded-lg bg-[#22c55e] py-4 text-[15px] font-semibold hover:bg-[#16a34a]"
            onClick={() => setShowCompletionModal(true)}
          >
            Complete Delivery
          </Button>
        ) : action ? (
          <Button
            className="w-full rounded-lg bg-brand-500 py-4 text-[15px] font-semibold hover:bg-brand-600"
            onClick={handleAction}
          >
            {action.label}
          </Button>
        ) : null}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Complete Delivery</h2>
            <p className="mt-1 text-sm text-gray-600">
              Please take a photo and collect customer signature
            </p>

            {/* Photo Capture */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">Proof of Delivery Photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              {photo ? (
                <div className="mt-2 relative">
                  <img src={photo} alt="Proof" className="w-full rounded-lg" />
                  <button
                    onClick={() => setPhoto(null)}
                    className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoCapture}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-gray-600 hover:border-gray-400"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
              )}
            </div>

            {/* Signature Pad */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Customer Signature (optional)</p>
                {signature && (
                  <button onClick={clearSignature} className="text-sm text-red-500">
                    Clear
                  </button>
                )}
              </div>
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="mt-2 w-full rounded-lg border border-gray-300 touch-none"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasMouseUp}
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCompletionModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#22c55e] hover:bg-[#16a34a]"
                onClick={handleComplete}
                disabled={!photo || isUploading}
              >
                {isUploading ? 'Completing...' : 'Complete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
