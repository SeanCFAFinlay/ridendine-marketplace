/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from '../../src/components/auth/auth-layout';

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('AuthLayout', () => {
  it('renders with title and subtitle', () => {
    render(
      <AuthLayout title="Test Title" subtitle="Test Subtitle">
        <div>Test Content</div>
      </AuthLayout>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders Ridendine logo link', () => {
    render(
      <AuthLayout title="Test">
        <div>Content</div>
      </AuthLayout>
    );

    const logo = screen.getByText('Ridendine');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders without subtitle when not provided', () => {
    render(
      <AuthLayout title="Test Title">
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
  });
});
