'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isAndroid: boolean;
  showIosModal: boolean;
  setShowIosModal: (show: boolean) => void;
  triggerInstall: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed as PWA or native webview)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone: boolean }).standalone));

    setIsInstalled(isStandalone);

    // Detect operating systems
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    const isAndroidDevice = /android/.test(ua);

    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // If iOS device and not standalone, it can be added to home screen
    if (isIosDevice && !isStandalone) {
      setIsInstallable(true);
    }

    // Capture standard PWA beforeinstallprompt event (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Chrome / Edge / Android native prompt
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      // iOS Safari guide
      setShowIosModal(true);
    } else {
      // Other platforms / desktop fallback
      setShowIosModal(true);
    }
  }, [deferredPrompt, isIos]);

  return (
    <PwaInstallContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIos,
        isAndroid,
        showIosModal,
        setShowIosModal,
        triggerInstall,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    return {
      isInstallable: false,
      isInstalled: false,
      isIos: false,
      isAndroid: false,
      showIosModal: false,
      setShowIosModal: () => {},
      triggerInstall: async () => {},
    };
  }
  return context;
}
