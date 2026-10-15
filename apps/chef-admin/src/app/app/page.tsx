'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Smartphone,
  Tablet,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Printer,
  ArrowRight,
  ExternalLink,
  ChefHat,
  Sparkles,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ChefAppDownloadPage() {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [appUrl, setAppUrl] = useState('https://chef.ridendine.ca/dashboard/kitchen');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setAppUrl(`${origin}/dashboard/kitchen`);

      // Detect OS
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      if (/android/i.test(userAgent)) {
        setPlatform('android');
      } else if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        setPlatform('ios');
      }

      // Check if already in standalone display mode
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
      }

      // Listen for PWA install event (Android / Chromium)
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      window.location.href = '/dashboard/kitchen';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-orange-500 selection:text-white">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-border {
            border: 2px dashed #000 !important;
            padding: 24px !important;
            border-radius: 16px !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="no-print border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight flex items-center gap-1.5">
                RideNDine <span className="text-orange-500">Chef App</span>
              </span>
              <span className="text-xs text-neutral-400 block -mt-0.5">Kitchen Display & Storefront</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors"
              title="Print QR poster for kitchen wall"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">Print Poster</span>
            </button>
            <Link
              href="/dashboard/kitchen"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-xs sm:text-sm font-semibold text-white hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20"
            >
              <span>Launch Kitchen</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Printable Poster Section (Formatted when printed) */}
        <div className="print-only text-center print-border mb-8">
          <h1 className="text-3xl font-extrabold text-black mb-2">BẾP BÀ MUỐI KITCHEN DISPLAY</h1>
          <p className="text-sm text-gray-700 mb-6 font-medium">RideNDine Partner Chef Portal & Order Queue</p>
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr?url=${encodeURIComponent(appUrl)}&format=svg&size=360`}
              alt="Scan QR code to install Chef App"
              className="w-72 h-72 border-4 border-black p-2 rounded-xl"
            />
          </div>
          <p className="text-lg font-bold text-black mb-1">SCAN WITH PHONE OR TABLET CAMERA</p>
          <p className="text-xs text-gray-600">Instantly opens live kitchen tickets, prep timers, and order dispatch</p>
          <p className="text-xs text-gray-500 mt-4">{appUrl}</p>
        </div>

        {/* Hero Section */}
        <div className="no-print text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Kitchen Tablet Setup</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Install the <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">Chef App</span> in Seconds
          </h1>
          <p className="mt-3 text-neutral-400 text-base sm:text-lg max-w-xl mx-auto">
            Scan the QR code below on your iPad, kitchen tablet, or smartphone to mount your full-screen Kitchen Display System.
          </p>
        </div>

        {/* QR Code & Action Card */}
        <div className="no-print grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Left: QR Display */}
          <div className="md:col-span-6 flex flex-col items-center text-center">
            <div className="relative group p-4 bg-white rounded-2xl shadow-xl shadow-orange-500/10 border-4 border-orange-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?url=${encodeURIComponent(appUrl)}&format=svg&size=260`}
                alt="Chef App Install QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-xl bg-orange-600 border-2 border-white flex items-center justify-center shadow-lg">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <QrCode className="w-4 h-4 text-orange-400" />
              <span>Scan using your device camera</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500 break-all max-w-xs">
              {appUrl}
            </div>

            {/* Quick action buttons */}
            <div className="mt-5 flex gap-2 w-full max-w-xs">
              <button
                onClick={handlePrint}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-400" />
                <span>Print Poster</span>
              </button>
              <a
                href={`/api/qr?url=${encodeURIComponent(appUrl)}&format=png&size=600`}
                download="ridendine-chef-app-qr.png"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-neutral-400" />
                <span>Save PNG</span>
              </a>
            </div>
          </div>

          {/* Right: Installation Controls */}
          <div className="md:col-span-6 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Kitchen Display & Operations</span>
              </h2>
              <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
                Transform any tablet or phone into a dedicated touch-screen kitchen terminal with sound chimes, live ticket orders, prep timers, and driver pickup alerts.
              </p>
            </div>

            {/* 1-Click Install or Open Button */}
            <div className="space-y-3">
              {installPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                >
                  <Tablet className="w-5 h-5" />
                  <span>Install Chef App on this Device</span>
                </button>
              ) : isInstalled ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Chef App is installed and running in standalone display mode!</span>
                </div>
              ) : (
                <Link
                  href="/dashboard/kitchen"
                  className="w-full py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Open Kitchen Display in Browser</span>
                </Link>
              )}
            </div>

            {/* Platform instructions selector */}
            <div className="pt-2 border-t border-neutral-800">
              <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-4">
                <button
                  onClick={() => setPlatform('ios')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    platform === 'ios'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>iPad / iPhone (iOS)</span>
                </button>
                <button
                  onClick={() => setPlatform('android')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    platform === 'android'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android Tablet / Phone</span>
                </button>
              </div>

              {platform === 'ios' ? (
                <ol className="space-y-3 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Scan the QR code or open <strong>chef.ridendine.ca</strong> in Safari.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-orange-400" /> at the top or bottom bar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-orange-400" />.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <span>Tap <strong>Add</strong> in the top right. Launch from your home screen for full-screen mode!</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-3 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Scan the QR code or open <strong>chef.ridendine.ca</strong> in Chrome.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Tap the <strong>three dots</strong> menu <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-orange-400" /> in the top right.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-orange-400 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <span>Confirm <strong>Install</strong>. The kitchen display icon appears instantly on your screen!</span>
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="no-print mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
              <ChefHat className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Live Kitchen Queue</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
              Orders appear instantly with chimes. Tap to accept, start prep, and call drivers when ready.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Tablet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Kitchen Mount Ready</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
              High-contrast dark mode tailored for kitchen environments, grease-resistant touch, and zero sleep-mode timeouts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Zero App Store Hassle</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
              No Apple App Store or Google Play Store login required. Simply scan the QR code to install and launch.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
