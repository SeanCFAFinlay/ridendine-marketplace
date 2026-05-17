/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock UI components
jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

const mockStorefront = {
  id: 'sf-1',
  name: "Jane's Kitchen",
  slug: 'janes-kitchen',
  description: 'Homemade comfort food',
  cuisine_types: ['American'],
  cover_image_url: null,
  logo_url: null,
  min_order_amount: 15,
  estimated_prep_time_min: 20,
  estimated_prep_time_max: 40,
  is_active: true,
};

import { StorefrontForm } from '../../src/components/storefront/storefront-form';

describe('StorefrontForm inline validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows name error when name is cleared and form is submitted', async () => {
    render(<StorefrontForm storefront={mockStorefront} />);

    const nameInput = screen.getByPlaceholderText('Your storefront name');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    const submitBtns = screen.getAllByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeTruthy();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error when prep time min is greater than max', async () => {
    render(<StorefrontForm storefront={mockStorefront} />);

    const minInput = screen.getByPlaceholderText('15');
    const maxInput = screen.getByPlaceholderText('45');

    fireEvent.change(minInput, { target: { value: '50' } });
    fireEvent.change(maxInput, { target: { value: '30' } });
    fireEvent.blur(maxInput);

    const submitBtns = screen.getAllByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/max must be greater than min/i)).toBeTruthy();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error when min order amount is negative', async () => {
    render(<StorefrontForm storefront={mockStorefront} />);

    const minOrderInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(minOrderInput, { target: { value: '-5' } });
    fireEvent.blur(minOrderInput);

    const submitBtns = screen.getAllByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/must be 0 or greater/i)).toBeTruthy();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows red border on invalid name input', async () => {
    render(<StorefrontForm storefront={mockStorefront} />);

    const nameInput = screen.getByPlaceholderText('Your storefront name');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(nameInput.classList.contains('border-danger')).toBe(true);
    });
  });

  it('shows green border on valid name after blur', async () => {
    render(<StorefrontForm storefront={mockStorefront} />);

    const nameInput = screen.getByPlaceholderText('Your storefront name');
    fireEvent.change(nameInput, { target: { value: "Jane's Kitchen Updated" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(nameInput.classList.contains('border-success')).toBe(true);
    });
  });

  it('calls fetch when form is valid', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storefront: mockStorefront }),
    });

    render(<StorefrontForm storefront={mockStorefront} />);

    const submitBtns = screen.getAllByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/storefront',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});
