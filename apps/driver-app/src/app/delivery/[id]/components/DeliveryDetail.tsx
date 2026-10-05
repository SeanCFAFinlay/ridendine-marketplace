'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, DELIVERY_STATUS_LABELS } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';
import { useLocationTracker } from '@/hooks/use-location-tracker';
import { RouteMap } from '@/components/map/route-map';
import {
  getOfflineOutbox,
  isOfflineApiError,
  type OutboxEntry,
  type PendingUpload,
} from '@/lib/offline-outbox';

type DeliveryStatus = 'assigned' | 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'picked_up' | 'en_route_to_dropoff' | 'arrived_at_dropoff';

type DeliveryIssueType =
  | 'chef_delay'
  | 'customer_unavailable'
  | 'damaged_package'
  | 'unsafe_route'
  | 'driver_emergency'
  | 'wrong_address'
  | 'unable_to_complete';

const ISSUE_OPTIONS: Array<{ value: DeliveryIssueType; label: string }> = [
  { value: 'chef_delay', label: 'Chef delay' },
  { value: 'customer_unavailable', label: 'Customer unavailable' },
  { value: 'damaged_package', label: 'Damaged package' },
  { value: 'unsafe_route', label: 'Unsafe route' },
  { value: 'driver_emergency', label: 'Driver emergency' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'unable_to_complete', label: 'Unable to complete' },
];

// Workflow state machine (focus/guidance) stays local; display labels come
// from the shared @ridendine/ui status map.
const WORK_STEPS: Record<
  DeliveryStatus,
  { label: string; focus: 'Pickup' | 'Dropoff'; guidance: string }
> = {
  assigned: {
    label: DELIVERY_STATUS_LABELS.assigned!,
    focus: 'Pickup',
    guidance: 'Head to the restaurant and keep the order visible in this app.',
  },
  accepted: {
    label: DELIVERY_STATUS_LABELS.accepted!,
    focus: 'Pickup',
    guidance: 'Head to the restaurant and keep the order visible in this app.',
  },
  en_route_to_pickup: {
    label: DELIVERY_STATUS_LABELS.en_route_to_pickup!,
    focus: 'Pickup',
    guidance: 'Follow the route to the restaurant, then mark arrival when you are there.',
  },
  arrived_at_pickup: {
    label: DELIVERY_STATUS_LABELS.arrived_at_pickup!,
    focus: 'Pickup',
    guidance: 'Confirm the order with the chef and take pickup proof before leaving.',
  },
  picked_up: {
    label: DELIVERY_STATUS_LABELS.picked_up!,
    focus: 'Dropoff',
    guidance: 'Start customer navigation and keep the package secure.',
  },
  en_route_to_dropoff: {
    label: DELIVERY_STATUS_LABELS.en_route_to_dropoff!,
    focus: 'Dropoff',
    guidance: 'Follow the route to the customer and watch for delivery instructions.',
  },
  arrived_at_dropoff: {
    label: DELIVERY_STATUS_LABELS.arrived_at_dropoff!,
    focus: 'Dropoff',
    guidance: 'Capture proof of delivery, collect the optional signature, and complete the delivery.',
  },
};

interface DeliveryDetailProps {
  delivery: Delivery;
  order: DeliveryOrder | null;
}

// Local status to apply when a queued entry is accepted by the server on
// replay. Dropoff proofs complete the delivery server-side, so they have no
// local DeliveryStatus to apply — router.refresh() picks up the new state.
function statusAfterReplay(entry: OutboxEntry): DeliveryStatus | null {
  try {
    const body = JSON.parse(entry.request.body) as Record<string, unknown>;
    if (entry.kind === 'status' && typeof body.status === 'string') {
      return body.status as DeliveryStatus;
    }
    if (entry.kind === 'proof' && body.eventType === 'pickup') {
      return 'picked_up';
    }
  } catch {
    // Malformed queue entry — nothing to apply locally.
  }
  return null;
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
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [issueType, setIssueType] = useState<DeliveryIssueType>('chef_delay');
  const [issueNotes, setIssueNotes] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [pendingSync, setPendingSync] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickupFileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Location tracking
  const locationTracker = useLocationTracker({
    driverId: delivery.driver_id || '',
    isOnline: true,
    deliveryId: delivery.id,
    updateInterval: 10000,
  });

  const getLocationMetadata = () => {
    const lat = locationTracker.lastLocation?.lat;
    const lng = locationTracker.lastLocation?.lng;
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return {};
    }
    return { lat, lng };
  };

  // ----- Offline outbox: queue mutations that fail offline, replay later -----

  const refreshQueuedCount = useCallback(async () => {
    try {
      const entries = await getOfflineOutbox().entriesFor(delivery.id);
      setQueuedCount(entries.length);
      if (entries.length === 0) setPendingSync(false);
    } catch {
      // IndexedDB unavailable — outbox features are silently disabled.
    }
  }, [delivery.id]);

  const replayOutbox = useCallback(async () => {
    let result;
    try {
      result = await getOfflineOutbox().replay();
    } catch {
      return;
    }

    const replayedHere = result.replayed.filter((entry) => entry.deliveryId === delivery.id);
    for (const entry of replayedHere) {
      const nextStatus = statusAfterReplay(entry);
      if (nextStatus) setStatus(nextStatus);
    }
    if (replayedHere.length > 0) {
      setSyncNotice('Your saved actions have been synced.');
      router.refresh();
    }

    const fallbacksHere = result.uploadFallbacks.filter(
      (item) => item.entry.deliveryId === delivery.id
    );
    if (fallbacksHere.length > 0) {
      setSyncNotice(
        `A saved photo could not be uploaded (${fallbacksHere
          .map((item) => item.message)
          .join('; ')}) — the proof was submitted with the captured photo instead.`
      );
    }

    const droppedHere = result.dropped.filter((item) => item.entry.deliveryId === delivery.id);
    if (droppedHere.length > 0) {
      setSyncNotice(
        `${droppedHere.length === 1 ? 'A saved action' : `${droppedHere.length} saved actions`} could not be applied: ${droppedHere
          .map((item) => item.message)
          .join('; ')}`
      );
    }

    await refreshQueuedCount();
  }, [delivery.id, refreshQueuedCount, router]);

  useEffect(() => {
    void refreshQueuedCount();
    if (typeof navigator === 'undefined' || navigator.onLine) {
      void replayOutbox();
    }
    const handleOnline = () => {
      void replayOutbox();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshQueuedCount, replayOutbox]);

  const queueMutation = async (
    kind: 'status' | 'proof' | 'issue',
    request: { url: string; method: string; body: string },
    pendingUploads?: PendingUpload[]
  ): Promise<boolean> => {
    try {
      await getOfflineOutbox().enqueue({
        kind,
        deliveryId: delivery.id,
        request,
        ...(pendingUploads && pendingUploads.length > 0 ? { pendingUploads } : {}),
      });
    } catch {
      return false; // IndexedDB unavailable — fall back to the normal error path.
    }
    await refreshQueuedCount();
    return true;
  };

  const getStatusSteps = () => {
    const steps = [
      { id: 'assigned', label: 'Assigned' },
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
      assigned: { label: 'Start Navigation to Pickup', nextStatus: 'en_route_to_pickup' },
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
    // Only trust coordinates when both are finite numbers; otherwise fall
    // back to the address so deep links never contain "null,null".
    const hasCoords =
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng);
    const encodedAddress = encodeURIComponent(address);
    const destination = hasCoords ? `${lat},${lng}` : encodedAddress;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    // Try to open in Google Maps app on mobile
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `google.navigation:q=${destination}`;
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      setTimeout(() => {
        window.open(url, '_blank');
      }, 500);
    } else {
      window.open(url, '_blank');
    }
  };

  // Open Apple Maps navigation (iOS / macOS)
  const openAppleMaps = (address: string, lat?: number | null, lng?: number | null) => {
    const hasCoords =
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng);
    const destination = hasCoords ? `${lat},${lng}` : encodeURIComponent(address);
    window.open(`https://maps.apple.com/?daddr=${destination}&dirflg=d`, '_blank');
  };

  const handleIssueSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedNotes = issueNotes.trim();
    if (!trimmedNotes) {
      setIssueError('Add a short note so Ops knows what is happening.');
      return;
    }

    setIsSubmittingIssue(true);
    setIssueError(null);
    setIssueSuccess(null);

    const request = {
      url: `/api/deliveries/${delivery.id}/issue`,
      method: 'POST',
      body: JSON.stringify({
        issueType,
        notes: trimmedNotes,
        ...getLocationMetadata(),
      }),
    };

    try {
      let response: Response | null = null;
      try {
        response = await fetch(request.url, {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          body: request.body,
        });
      } catch {
        response = null; // Network-level failure — queue below.
      }

      if (response) {
        const json = await response.json().catch(() => ({}));
        if (response.ok && json.success !== false) {
          setIssueSuccess(
            'Ops has received this issue. Keep working if it is safe, or wait for Ops if this blocks the delivery.'
          );
          setIssueNotes('');
          return;
        }
        if (!isOfflineApiError(response.status, json)) {
          throw new Error(json.error || 'Unable to send this issue right now.');
        }
      }

      if (await queueMutation('issue', request)) {
        setIssueSuccess(
          "You're offline — this issue is saved and will be sent to Ops automatically when you reconnect."
        );
        setIssueNotes('');
        return;
      }
      throw new Error('Unable to send this issue right now.');
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : 'Unable to send this issue right now.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleAction = async () => {
    const action = getNextAction();
    if (!action || isAdvancing) return;
    setErrorMessage(null);

    // Intercept pickup confirmation to require photo
    if (action.nextStatus === 'picked_up') {
      setShowPickupModal(true);
      return;
    }

    setIsAdvancing(true);
    try {
      // Persist the status change first; only open navigation once the
      // server has confirmed the update.
      const updated = await advanceStatus(action.nextStatus);
      if (!updated) return;

      if (action.nextStatus === 'en_route_to_pickup') {
        openNavigation(delivery.pickup_address, delivery.pickup_lat, delivery.pickup_lng);
      } else if (action.nextStatus === 'en_route_to_dropoff') {
        openNavigation(delivery.dropoff_address, delivery.dropoff_lat, delivery.dropoff_lng);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const advanceStatus = async (nextStatus: DeliveryStatus): Promise<boolean> => {
    const request = {
      url: `/api/deliveries/${delivery.id}`,
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    };

    try {
      let response: Response | null = null;
      try {
        response = await fetch(request.url, {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          body: request.body,
        });
      } catch {
        response = null; // Network-level failure — queue below.
      }

      if (response) {
        if (response.ok) {
          setStatus(nextStatus);
          router.refresh();
          return true;
        }
        const json = await response.json().catch(() => ({}));
        if (!isOfflineApiError(response.status, json)) {
          throw new Error(json.error || 'Failed to update delivery status');
        }
      }

      // Offline: queue the status change and show it as pending sync instead
      // of advancing the local status (the server has not confirmed it yet).
      if (await queueMutation('status', request)) {
        setPendingSync(true);
        setSyncNotice(
          "You're offline — this update is saved and will sync automatically when you reconnect."
        );
        return false;
      }
      throw new Error('Failed to update delivery status while offline');
    } catch (error) {
      console.error('Error updating delivery:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update delivery status'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
  };

  // Returns the uploaded URL, or null when the upload failed because the
  // device is offline (network failure or the SW's offline 503). Real server
  // rejections still throw.
  const uploadPhotoOrNull = async (
    dataUrl: string,
    context: 'pickup' | 'dropoff' | 'signature'
  ): Promise<string | null> => {
    let response: Response;
    try {
      response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, context, deliveryId: delivery.id }),
      });
    } catch {
      return null;
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (isOfflineApiError(response.status, json)) return null;
      throw new Error(json.error || 'Upload failed');
    }
    if (typeof json.url !== 'string') {
      throw new Error('Upload failed');
    }
    return json.url;
  };

  const submitDeliveryProof = async (
    eventType: 'pickup' | 'dropoff',
    proofUrl: string,
    metadata: { notes?: string; signatureUrl?: string } = {}
  ): Promise<'ok' | 'queued'> => {
    const request = {
      url: `/api/deliveries/${delivery.id}/proof`,
      method: 'POST',
      body: JSON.stringify({
        eventType,
        proofUrl,
        ...getLocationMetadata(),
        ...metadata,
      }),
    };

    let response: Response | null = null;
    try {
      response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: request.body,
      });
    } catch {
      response = null; // Network-level failure — queue below.
    }

    if (response) {
      if (response.ok) return 'ok';
      const json = await response.json().catch(() => ({}));
      if (!isOfflineApiError(response.status, json)) {
        throw new Error(json.error || 'Failed to submit delivery proof');
      }
    }

    if (await queueMutation('proof', request)) return 'queued';
    throw new Error('Failed to submit delivery proof while offline');
  };

  // Queue a proof whose photo(s) could not be uploaded because the device is
  // offline. The request body omits the pending fields; on replay the outbox
  // uploads each photo to /api/upload first and substitutes the returned URL
  // into the body before submitting the proof.
  const queueProofWithUploads = async (
    eventType: 'pickup' | 'dropoff',
    pendingUploads: PendingUpload[],
    metadata: { proofUrl?: string; signatureUrl?: string } = {}
  ): Promise<'queued'> => {
    const request = {
      url: `/api/deliveries/${delivery.id}/proof`,
      method: 'POST',
      body: JSON.stringify({
        eventType,
        ...getLocationMetadata(),
        ...metadata,
      }),
    };
    if (await queueMutation('proof', request, pendingUploads)) return 'queued';
    throw new Error('Failed to submit delivery proof while offline');
  };

  const handlePickupConfirm = async () => {
    if (!pickupPhoto) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Offline fallback: when the upload cannot reach the server, queue the
      // proof with the photo as a pending upload so replay uploads it first.
      const uploadedUrl = await uploadPhotoOrNull(pickupPhoto, 'pickup');
      const proofResult = uploadedUrl
        ? await submitDeliveryProof('pickup', uploadedUrl)
        : await queueProofWithUploads('pickup', [
            { field: 'proofUrl', dataUrl: pickupPhoto, context: 'pickup', deliveryId: delivery.id },
          ]);

      if (proofResult === 'queued') {
        setPendingSync(true);
        setSyncNotice(
          "You're offline — pickup proof is saved and will sync automatically when you reconnect."
        );
      } else {
        setStatus('picked_up');
        router.refresh();
      }
      setShowPickupModal(false);
      setPickupPhoto(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to confirm pickup');
    } finally {
      setIsUploading(false);
    }
  };

  // Photo capture
  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPhoto(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handlePickupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPickupPhoto(reader.result as string); };
    reader.readAsDataURL(file);
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
    if (!photo) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Offline fallback: when an upload cannot reach the server, queue the
      // proof with the captured photo(s) as pending uploads so replay uploads
      // them before submitting the proof.
      const pendingUploads: PendingUpload[] = [];

      const uploadedUrl = await uploadPhotoOrNull(photo, 'dropoff');
      if (!uploadedUrl) {
        pendingUploads.push({
          field: 'proofUrl',
          dataUrl: photo,
          context: 'dropoff',
          deliveryId: delivery.id,
        });
      }

      let signatureUrl: string | undefined;
      if (signature) {
        // Skip the signature upload attempt when the photo upload already
        // failed offline — queue it as a pending upload right away.
        const uploadedSignatureUrl = uploadedUrl
          ? await uploadPhotoOrNull(signature, 'signature')
          : null;
        if (uploadedSignatureUrl) {
          signatureUrl = uploadedSignatureUrl;
        } else {
          pendingUploads.push({
            field: 'signatureUrl',
            dataUrl: signature,
            context: 'signature',
            deliveryId: delivery.id,
          });
        }
      }

      const proofResult =
        pendingUploads.length > 0
          ? await queueProofWithUploads('dropoff', pendingUploads, {
              ...(uploadedUrl ? { proofUrl: uploadedUrl } : {}),
              ...(signatureUrl ? { signatureUrl } : {}),
            })
          : await submitDeliveryProof(
              'dropoff',
              // uploadedUrl is always set when nothing is pending; `?? photo`
              // only satisfies the type checker.
              uploadedUrl ?? photo,
              signatureUrl ? { signatureUrl } : {}
            );

      if (proofResult === 'queued') {
        setPendingSync(true);
        setSyncNotice(
          "You're offline — delivery proof is saved and will sync automatically when you reconnect."
        );
        setShowCompletionModal(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error completing delivery:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to complete delivery'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const steps = getStatusSteps();
  const action = getNextAction();
  const workStep = WORK_STEPS[status];
  const isPickupWork = status.includes('pickup') || status === 'accepted' || status === 'assigned';

  const renderWorkPanel = () => (
    <div className="p-4">
      <Card className="border border-divider bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Delivery work</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">{workStep.guidance}</p>
          </div>
          <span className="rounded-full bg-infoSoft px-3 py-1 text-[12px] font-semibold text-info">
            {workStep.focus}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-surfaceMuted p-3">
            <p className="text-[12px] font-medium uppercase text-[#6b7280]">Current step</p>
            <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{workStep.label}</p>
          </div>
          <div className="rounded-lg bg-surfaceMuted p-3">
            <p className="text-[12px] font-medium uppercase text-[#6b7280]">Next action</p>
            <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
              {status === 'arrived_at_dropoff' ? 'Complete Delivery' : action?.label ?? 'No action needed'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-danger/30 px-4 py-3 text-[14px] font-semibold text-danger transition-colors hover:bg-dangerSoft"
          onClick={() => {
            setShowIssuePanel((current) => !current);
            setIssueError(null);
            setIssueSuccess(null);
          }}
        >
          {showIssuePanel ? 'Close issue report' : 'Report issue to Ops'}
        </button>
      </Card>
    </div>
  );

  const renderIssuePanel = () => {
    if (!showIssuePanel) return null;

    return (
      <div className="px-4 pb-4">
        <Card className="border border-danger/20 bg-white p-4 shadow-sm">
          <h3 className="text-[16px] font-semibold text-[#1a1a1a]">Send issue to Ops</h3>
          <form className="mt-4 space-y-4" onSubmit={handleIssueSubmit}>
            <label className="block">
              <span className="text-[13px] font-medium text-[#374151]">Issue type</span>
              <select
                aria-label="Issue type"
                value={issueType}
                onChange={(event) => setIssueType(event.target.value as DeliveryIssueType)}
                className="mt-1 w-full rounded-lg border border-divider bg-white px-3 py-2 text-[14px] text-[#1a1a1a]"
              >
                {ISSUE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[13px] font-medium text-[#374151]">Issue notes</span>
              <textarea
                aria-label="Issue notes"
                value={issueNotes}
                onChange={(event) => setIssueNotes(event.target.value)}
                rows={4}
                maxLength={1000}
                className="mt-1 w-full resize-none rounded-lg border border-divider px-3 py-2 text-[14px] text-[#1a1a1a]"
                placeholder="Example: Chef needs another 20 minutes."
              />
            </label>

            {issueError && (
              <p className="rounded-lg bg-dangerSoft p-3 text-[13px] font-medium text-danger">
                {issueError}
              </p>
            )}
            {issueSuccess && (
              <p className="rounded-lg bg-successSoft p-3 text-[13px] font-medium text-success">
                {issueSuccess}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmittingIssue}
              className="w-full rounded-lg bg-danger py-3 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isSubmittingIssue ? 'Sending...' : 'Send issue to Ops'}
            </Button>
          </form>
        </Card>
      </div>
    );
  };

  const renderRoutePanel = () => {
    const activePolyline = isPickupWork
      ? (delivery.route_to_pickup_polyline || delivery.route_to_dropoff_polyline)
      : delivery.route_to_dropoff_polyline;

    const hasDriverGps =
      typeof locationTracker.lastLocation?.lat === 'number' &&
      typeof locationTracker.lastLocation?.lng === 'number';

    return (
      <>
        <div className="p-4">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    hasDriverGps ? 'animate-ping bg-[#22c55e]' : 'animate-pulse bg-[#f59e0b]'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    hasDriverGps ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'
                  }`}
                />
              </span>
              <span className="text-xs font-semibold text-[#1a1a1a]">
                {locationTracker.isPosting
                  ? 'Updating GPS...'
                  : hasDriverGps
                  ? 'GPS Active & Broadcasting'
                  : 'Acquiring GPS Signal...'}
              </span>
              {hasDriverGps && locationTracker.lastLocation && (
                <span className="hidden font-mono text-[11px] text-[#6b7280] sm:inline">
                  ({locationTracker.lastLocation.lat.toFixed(4)}, {locationTracker.lastLocation.lng.toFixed(4)})
                </span>
              )}
            </div>
            {locationTracker.locationError && (
              <button
                type="button"
                onClick={locationTracker.startTracking}
                className="text-xs font-medium text-primary hover:underline"
              >
                Retry GPS
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full rounded-lg border-info py-2.5 text-xs font-semibold text-info hover:bg-infoSoft sm:text-sm"
              onClick={() => {
                if (isPickupWork) {
                  openNavigation(delivery.pickup_address, delivery.pickup_lat, delivery.pickup_lng);
                } else {
                  openNavigation(delivery.dropoff_address, delivery.dropoff_lat, delivery.dropoff_lng);
                }
              }}
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Google Maps
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-lg border-border py-2.5 text-xs font-semibold text-text hover:bg-surfaceMuted sm:text-sm"
              onClick={() => {
                if (isPickupWork) {
                  openAppleMaps(delivery.pickup_address, delivery.pickup_lat, delivery.pickup_lng);
                } else {
                  openAppleMaps(delivery.dropoff_address, delivery.dropoff_lat, delivery.dropoff_lng);
                }
              }}
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Apple Maps
            </Button>
          </div>
        </div>

        <div className="p-4 pt-0">
          <RouteMap
            pickupLat={delivery.pickup_lat}
            pickupLng={delivery.pickup_lng}
            pickupAddress={delivery.pickup_address}
            dropoffLat={delivery.dropoff_lat}
            dropoffLng={delivery.dropoff_lng}
            dropoffAddress={delivery.dropoff_address}
            driverLat={locationTracker.lastLocation?.lat}
            driverLng={locationTracker.lastLocation?.lng}
            polyline={activePolyline}
            className="h-60 w-full overflow-hidden rounded-2xl border border-divider shadow-sm"
          />
        </div>
      </>
    );
  };

  const renderContactPanel = () => (
    <div className="p-4 pt-0">
      <Card className="border-0 shadow-sm">
        {isPickupWork ? (
          <>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
              <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Pickup</h3>
            </div>
            <p className="mt-3 text-[15px] font-medium text-[#1a1a1a]">Restaurant Location</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
              {delivery.pickup_address}
            </p>
            {deliveryWithContact.pickup_phone ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={() => window.open(`tel:${deliveryWithContact.pickup_phone}`, '_self')}
              >
                Call Restaurant
              </Button>
            ) : (
              <p className="mt-4 text-[13px] text-[#6b7280]">No restaurant phone number on file</p>
            )}
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
            {order?.customer_phone ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={() => window.open(`tel:${order.customer_phone}`, '_self')}
              >
                Call Customer
              </Button>
            ) : (
              <p className="mt-4 text-[13px] text-[#6b7280]">No customer phone number on file</p>
            )}
          </>
        )}
      </Card>
    </div>
  );

  const renderProofPanel = () => (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
        {status === 'arrived_at_dropoff' ? (
          <Button
            className="w-full rounded-lg bg-[#22c55e] py-4 text-[15px] font-semibold hover:bg-[#16a34a] disabled:opacity-60"
            onClick={() => setShowCompletionModal(true)}
            disabled={pendingSync}
          >
            {pendingSync ? 'Waiting to sync...' : 'Complete Delivery'}
          </Button>
        ) : action ? (
          <Button
            className="w-full rounded-lg bg-brand-500 py-4 text-[15px] font-semibold hover:bg-brand-600 disabled:opacity-60"
            onClick={handleAction}
            disabled={isAdvancing || pendingSync}
          >
            {pendingSync ? 'Waiting to sync...' : isAdvancing ? 'Updating...' : action.label}
          </Button>
        ) : null}
      </div>

      {showPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6"
          >
            <h2 id="pickup-modal-title" className="text-xl font-bold text-text">Confirm Pickup</h2>
            <p className="mt-1 text-sm text-textMuted">Take a photo of the order to confirm pickup</p>

            <input
              ref={pickupFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePickupFileChange}
              className="hidden"
            />

            <div className="mt-4">
              {pickupPhoto ? (
                <div className="relative">
                  <img src={pickupPhoto} alt="Pickup proof" className="w-full rounded-lg" />
                  <button
                    onClick={() => setPickupPhoto(null)}
                    className="absolute right-2 top-2 rounded-full bg-danger p-1 text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => pickupFileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-borderStrong p-6 text-textMuted hover:border-borderStrong"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowPickupModal(false); setPickupPhoto(null); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primaryHover"
                onClick={handlePickupConfirm}
                disabled={!pickupPhoto || isUploading}
              >
                {isUploading ? 'Confirming...' : 'Confirm Pickup'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-modal-title"
            className="w-full max-w-md rounded-xl bg-white p-6"
          >
            <h2 id="completion-modal-title" className="text-xl font-bold text-text">Complete Delivery</h2>
            <p className="mt-1 text-sm text-textMuted">
              Please take a photo and collect customer signature
            </p>

            <div className="mt-4">
              <p className="text-sm font-medium text-text">Proof of Delivery Photo</p>
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
                    className="absolute top-2 right-2 rounded-full bg-danger p-1 text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoCapture}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-borderStrong p-6 text-textMuted hover:border-borderStrong"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text">Customer Signature (optional)</p>
                {signature && (
                  <button onClick={clearSignature} className="text-sm text-danger">
                    Clear
                  </button>
                )}
              </div>
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="mt-2 w-full rounded-lg border border-borderStrong touch-none"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasMouseUp}
              />
            </div>

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
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {errorMessage && (
        <div className="p-4 pb-0">
          <Card className="border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {errorMessage}
          </Card>
        </div>
      )}
      {(locationTracker.permissionState === 'denied' || locationTracker.locationError) && (
        <div className="p-4 pb-0">
          <Card
            role="alert"
            className="border border-danger/30 bg-dangerSoft p-3 text-sm font-medium text-danger"
          >
            Location tracking is off — customers can&apos;t see your position. Enable location for
            this site.
          </Card>
        </div>
      )}
      {queuedCount > 0 && (
        <div className="p-4 pb-0">
          <Card className="border border-warning/30 bg-warningSoft p-3 text-sm font-medium text-warning">
            {queuedCount} action{queuedCount === 1 ? '' : 's'} waiting to sync — will retry
            automatically when you&apos;re back online.
          </Card>
        </div>
      )}
      {syncNotice && (
        <div className="p-4 pb-0">
          <Card className="border border-info/30 bg-infoSoft p-3 text-sm text-info">
            {syncNotice}
          </Card>
        </div>
      )}
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

      {renderWorkPanel()}
      {renderIssuePanel()}
      {renderRoutePanel()}
      {renderContactPanel()}

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

      {renderProofPanel()}
    </div>
  );
}
