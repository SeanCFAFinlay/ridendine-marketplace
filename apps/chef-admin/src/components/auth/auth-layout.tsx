'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AuthLayout as SharedAuthLayout } from '@ridendine/ui';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <SharedAuthLayout
      title={title}
      subtitle={subtitle}
      variant="chef"
      badgeText="Chef Portal"
      logo={
        <Link href="/">
          <Image
            src="/logo-icon.png"
            alt="RideNDine"
            width={72}
            height={72}
            className="mx-auto h-auto w-16 rounded-2xl shadow-md"
            priority
          />
        </Link>
      }
    >
      {children}
    </SharedAuthLayout>
  );
}
