/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PasswordStrength } from '@ridendine/ui';

describe('PasswordStrength', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows weak strength for short password', () => {
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText(/Weak/)).toBeInTheDocument();
  });

  it('shows fair strength for medium password', () => {
    render(<PasswordStrength password="abc12345" />);
    expect(screen.getByText(/Fair/)).toBeInTheDocument();
  });

  it('shows good strength when length + character variety reaches UI threshold', () => {
    render(<PasswordStrength password="Abc1!def" />);
    expect(screen.getByText(/Good/)).toBeInTheDocument();
  });

  it('shows strong strength for complex password', () => {
    render(<PasswordStrength password="Abc123!@#XYZ" />);
    expect(screen.getByText(/Strong/)).toBeInTheDocument();
  });

  it('renders 4 strength indicator bars', () => {
    const { container } = render(<PasswordStrength password="test" />);
    const bars = container.querySelectorAll('.h-1');
    expect(bars).toHaveLength(4);
  });
});
