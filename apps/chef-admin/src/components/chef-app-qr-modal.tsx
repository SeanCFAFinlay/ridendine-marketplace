'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  X,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Tablet,
  ChefHat,
} from 'lucide-react';

interface ChefAppQrModalProps {
  buttonText?: string;
  variant?: 'header' | 'button' | 'icon';
}

export function ChefAppQrModal({ buttonText = 'Get Tablet App', variant = 'header' }: ChefAppQrModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('https://chef.ridendine.ca/dashboard/kitchen');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(`${window.location.origin}/dashboard/kitchen`);
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          title="Scan QR code to install Chef App on iPad / Mobile"
        >
          <QrCode className="h-4 w-4" />
          <span className="hidden xl:inline">{buttonText}</span>
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 shadow-md transition-colors"
        >
          <QrCode className="h-4 w-4" />
          <span>{buttonText}</span>
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-textMuted hover:bg-surfaceMuted hover:text-text transition-colors"
          title="Scan QR Code to install app"
        >
          <QrCode className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 items-center justify-center text-orange-400 mb-3 shadow-inner">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Chef & Kitchen Display App
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Scan with any iPad, tablet, or smartphone camera
              </p>
            </div>

            {/* QR Code */}
            <div className="mt-5 flex justify-center">
              <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-orange-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr?url=${encodeURIComponent(appUrl)}&format=svg&size=200`}
                  alt="Scan to open Chef App"
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>

            {/* Quick action badges */}
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Tablet className="w-3.5 h-3.5 text-orange-400" />
                iPad / Tablets
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                Phones
              </span>
            </div>

            {/* URL & Copy */}
            <div className="mt-4 flex items-center gap-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <span className="truncate text-neutral-400 flex-1 font-mono text-[11px] px-1">
                {appUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1 text-[11px]"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Action Links */}
            <div className="mt-5 space-y-2">
              <Link
                href="/app"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Kitchen Poster / Install Guide</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
