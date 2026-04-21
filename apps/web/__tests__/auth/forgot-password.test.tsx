/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock AuthLayout
jest.mock('../../src/components/auth/auth-layout', () => ({
  AuthLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

// Mock UI components
jest.mock('@ridendine/ui', () => ({
  Button: ({ children, loading, ...props }: { children: React.ReactNode; loading?: boolean; [key: string]: unknown }) => (
    <button {...props} disabled={loading}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, onChange, value, ...props }: { label: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; value: string; [key: string]: unknown }) => (
    <div>
      <label>{label}</label>
      <input onChange={onChange} value={value} {...props} />
    </div>
  ),
}));

const mockResetPassword = jest.fn();

// Mock useAuth from @ridendine/auth
jest.mock('@ridendine/auth', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
  }),
}));

import ForgotPasswordPage from '../../src/app/auth/forgot-password/page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the forgot password form', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('calls resetPassword with email on submit and shows success state on success', async () => {
    mockResetPassword.mockResolvedValueOnce({ success: true });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('displays error message when resetPassword returns error', async () => {
    mockResetPassword.mockResolvedValueOnce({
      success: false,
      error: 'Email not found',
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  it('displays fallback error when resetPassword returns failure without error message', async () => {
    mockResetPassword.mockResolvedValueOnce({ success: false });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to send reset email. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('displays unexpected error message when resetPassword throws', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('Network error'));

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error occurred. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('does NOT use setTimeout (mock detection)', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    render(<ForgotPasswordPage />);

    mockResetPassword.mockResolvedValueOnce({ success: true });

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });
});
