'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Purge deprecated v1 cache if present on the device
    if ('caches' in window) {
      caches.delete('ridendine-driver-v1').catch(() => undefined);
    }

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Trigger update check on active registration
        reg.update().catch(() => undefined);
      }).catch((err) => {
        console.error('Service worker registration failed:', err);
      });
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    }
  }, []);

  return null;
}
