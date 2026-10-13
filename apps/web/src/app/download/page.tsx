'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { usePwaInstall } from '@/contexts/pwa-install-context';
import { Badge, Button, Card } from '@ridendine/ui';

export default function DownloadPage() {
  const { triggerInstall, isInstalled, isInstallable } = usePwaInstall();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-surfaceSubtle py-12 sm:py-16">
        <div className="container text-center">
          <Badge tone="accent">Ontario Mobile Applications</Badge>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text sm:text-5xl">
            Download the RideNDine Apps
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-textMuted sm:text-lg">
            Enjoy seamless food delivery, drive and earn on your schedule, or run your home kitchen operations. Fast, installable apps for all your devices.
          </p>
        </div>
      </section>

      {/* Main Apps Grid */}
      <section className="container py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* 1. Customer Marketplace App */}
          <Card elevated padding="lg" className="flex flex-col justify-between border-2 border-primary/20">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <Image
                  src="/logo-icon.png"
                  alt="RideNDine Customer App"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-xl border border-border bg-surface object-contain p-1 shadow-sm"
                />
                <Badge tone="success">Food Delivery</Badge>
              </div>

              <h2 className="font-display text-xl font-bold text-text">RideNDine Customer App</h2>
              <p className="mt-2 text-sm text-textMuted">
                Discover local Ontario chefs, track live deliveries, and order authentic home-cooked meals with simple checkout.
              </p>

              <ul className="mt-6 space-y-2 text-xs text-textMuted">
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Live GPS order & courier tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Exclusive local chef menus in Ontario
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> 1-tap reordering of favorite dishes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Works offline and on flaky cellular networks
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={triggerInstall}
              >
                {isInstalled ? 'App Installed ✓' : isInstallable ? 'Install Customer App' : 'Download / Install App'}
              </Button>
              <Link href="/chefs" className="block text-center text-xs text-textMuted hover:text-primary">
                Browse Marketplace Now →
              </Link>
            </div>
          </Card>

          {/* 2. Courier Driver App */}
          <Card elevated padding="lg" className="flex flex-col justify-between border border-border">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primarySoft text-primary shadow-sm">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <Badge tone="accent">Couriers</Badge>
              </div>

              <h2 className="font-display text-xl font-bold text-text">RideNDine Courier Driver</h2>
              <p className="mt-2 text-sm text-textMuted">
                Accept delivery dispatches, navigate via GPS, track shifts and instant payouts across Ontario.
              </p>

              <ul className="mt-6 space-y-2 text-xs text-textMuted">
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Turn-by-turn navigation & route optimization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Urgent audio chime & haptic alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Fast direct bank payouts & earnings ledger
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Offline proof-of-delivery sync
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="https://driver.ridendine.ca"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="secondary" fullWidth size="lg">
                  Open Driver App ↗
                </Button>
              </a>
              <p className="text-center text-xs text-textSubtle">
                Installable from Safari / Chrome to Home Screen
              </p>
            </div>
          </Card>

          {/* 3. Chef Kitchen Portal & KDS */}
          <Card elevated padding="lg" className="flex flex-col justify-between border border-border">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-successSoft text-success shadow-sm">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <Badge tone="neutral">Kitchens</Badge>
              </div>

              <h2 className="font-display text-xl font-bold text-text">Chef Kitchen & KDS App</h2>
              <p className="mt-2 text-sm text-textMuted">
                Full-featured Kitchen Display System for tablets and desktop. Manage menus, orders, and thermal printing.
              </p>

              <ul className="mt-6 space-y-2 text-xs text-textMuted">
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Real-time ticket board with prep countdowns
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> 80mm ESC/POS thermal receipt auto-printing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Multi-brand & virtual storefront switching
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> Ontario public health & food safety logs
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="https://chef.ridendine.ca"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="secondary" fullWidth size="lg">
                  Open Kitchen App ↗
                </Button>
              </a>
              <Link href="/chef-signup" className="block text-center text-xs text-textMuted hover:text-primary">
                Apply as a Home Chef →
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Installation Instructions Guide */}
      <section className="border-t border-border bg-surfaceSubtle py-12 sm:py-16">
        <div className="container max-w-4xl">
          <h2 className="text-center font-display text-2xl font-bold text-text sm:text-3xl">
            How to Install on Your Device
          </h2>
          <p className="mt-2 text-center text-sm text-textMuted">
            RideNDine apps are Progressive Web Apps (PWAs) that run directly on your hardware without 100MB+ app store downloads.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* iOS */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍎</span>
                <h3 className="font-semibold text-text">iOS (iPhone & iPad)</h3>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-textMuted">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span> Open RideNDine in Safari on your phone.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span> Tap the <span className="font-medium text-text">Share 📤</span> button at the bottom of the screen.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3.</span> Scroll and tap <span className="font-medium text-text">Add to Home Screen ➕</span>.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">4.</span> Tap <span className="font-medium text-text">Add</span>. The app icon appears on your home screen!
                </li>
              </ol>
            </div>

            {/* Android */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <h3 className="font-semibold text-text">Android & Chrome</h3>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-textMuted">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span> Open RideNDine in Chrome on your phone.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span> Tap the <span className="font-medium text-text">Install App</span> banner or tap the 3-dot menu ⋮.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3.</span> Tap <span className="font-medium text-text">Install App</span> or <span className="font-medium text-text">Add to Home Screen</span>.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">4.</span> Confirm installation to launch the full standalone app!
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
