/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChangePasswordForm } from '../change-password-form';

// Mock @ridendine/ui components
jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, loading, disabled, type, ...props }: any) => (
    <button type={type || 'button'} disabled={loading || disabled} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, value, onChange, placeholder, type, required }: any) => (
    <label>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </label>
  ),
}));

describe('ChangePasswordForm component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders all password inputs and update button', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByText('Current Password')).toBeInTheDocument();
    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Password' })).toBeInTheDocument();
  });

  it('shows error when new password is less than 8 characters', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'oldpass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(screen.getByTestId('change-password-error')).toHaveTextContent(
        'New password must be at least 8 characters long.'
      );
    });
  });

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'oldpass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'mismatchpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(screen.getByTestId('change-password-error')).toHaveTextContent(
        'New passwords do not match. Please re-enter.'
      );
    });
  });

  it('submits successfully and shows success confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Password changed successfully' }),
    });

    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'ride1234' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'myNewStrongPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'myNewStrongPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(screen.getByTestId('change-password-success')).toHaveTextContent(
        'Your password has been changed successfully!'
      );
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'ride1234',
        newPassword: 'myNewStrongPass123',
      }),
    }));
  });
});
