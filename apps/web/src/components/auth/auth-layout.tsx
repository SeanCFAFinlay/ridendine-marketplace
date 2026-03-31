'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@ridendine/ui';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fff8f4] via-white to-[#f0faf9] px-4 py-12">
      <Card className="w-full max-w-md shadow-lg" padding="lg">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="RideNDine"
              width={120}
              height={156}
              className="mx-auto h-auto w-24"
              priority
            />
            <div className="mt-2 text-2xl font-bold tracking-tight">
              <span className="text-[#1a7a6e]">RideN</span>
              <span className="text-[#E85D26]">Dine</span>
            </div>
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">
          {children}
        </div>
      </Card>
    </div>
  );
}
