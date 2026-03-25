'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@ridendine/ui';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-4 py-12">
      <Card className="w-full max-w-md bg-white" padding="lg">
        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-3xl font-bold tracking-tight"
            style={{ color: '#E85D26' }}
          >
            Ridendine
          </Link>
          <div className="mt-2 text-sm font-medium text-slate-600">
            Chef Portal
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
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
