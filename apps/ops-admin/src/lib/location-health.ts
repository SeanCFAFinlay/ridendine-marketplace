export type LocationHealthStatus = 'live' | 'stale' | 'offline' | 'unknown';

export type LocationHealth = {
  status: LocationHealthStatus;
  label: string;
  detail: string;
  minutesOld: number | null;
};

export function getLocationHealth(lastSeen: string | null | undefined, presenceStatus?: string | null): LocationHealth {
  if (!lastSeen) {
    return {
      status: presenceStatus === 'offline' ? 'offline' : 'unknown',
      label: presenceStatus === 'offline' ? 'Offline' : 'No GPS',
      detail: 'No location heartbeat',
      minutesOld: null,
    };
  }

  const timestamp = Date.parse(lastSeen);
  if (!Number.isFinite(timestamp)) {
    return { status: 'unknown', label: 'No GPS', detail: 'Invalid location timestamp', minutesOld: null };
  }

  const minutesOld = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (presenceStatus === 'offline') {
    return { status: 'offline', label: 'Offline', detail: `Last seen ${minutesOld} min ago`, minutesOld };
  }
  if (minutesOld <= 5) {
    return { status: 'live', label: 'Live GPS', detail: `Updated ${minutesOld} min ago`, minutesOld };
  }
  if (minutesOld <= 20) {
    return { status: 'stale', label: 'Stale GPS', detail: `Updated ${minutesOld} min ago`, minutesOld };
  }
  return { status: 'offline', label: 'Offline GPS', detail: `Last seen ${minutesOld} min ago`, minutesOld };
}

export function locationHealthClass(status: LocationHealthStatus) {
  if (status === 'live') return 'bg-success/20 text-success';
  if (status === 'stale') return 'bg-warning/20 text-warning';
  if (status === 'offline') return 'bg-surfaceMuted text-textSubtle';
  return 'bg-danger/20 text-danger';
}
