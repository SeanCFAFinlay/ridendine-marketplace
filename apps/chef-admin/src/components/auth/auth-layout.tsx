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
            src="/logo.png"
            alt="RideNDine"
            width={120}
            height={150}
            className="mx-auto h-24 w-auto object-contain drop-shadow"
            priority
          />
        </Link>
      }
    >
      {children}
    </SharedAuthLayout>
  );
}
