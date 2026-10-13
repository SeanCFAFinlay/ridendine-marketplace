/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileAppBottomNav } from '../../src/components/layout/mobile-bottom-nav';

const mockUsePathname = jest.fn();
const mockUseCart = jest.fn();
const mockUseAuthContext = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    className,
    'aria-label': ariaLabel,
    'aria-current': ariaCurrent,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    'aria-label'?: string;
    'aria-current'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));

jest.mock('@/contexts/cart-context', () => ({
  useCart: () => mockUseCart(),
}));

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

describe('MobileAppBottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart.mockReturnValue({ itemCount: 0 });
    mockUseAuthContext.mockReturnValue({ user: null });
  });

  it('renders bottom navigation on the home page and highlights Explore', () => {
    mockUsePathname.mockReturnValue('/');
    render(<MobileAppBottomNav />);

    const nav = screen.getByTestId('mobile-app-bottom-nav');
    expect(nav).toBeInTheDocument();

    const exploreLink = screen.getByRole('link', { name: /explore/i });
    expect(exploreLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders bottom navigation on /chefs directory', () => {
    mockUsePathname.mockReturnValue('/chefs');
    render(<MobileAppBottomNav />);

    expect(screen.getByTestId('mobile-app-bottom-nav')).toBeInTheDocument();
    const exploreLink = screen.getByRole('link', { name: /explore/i });
    expect(exploreLink).toHaveAttribute('aria-current', 'page');
  });

  it('hides bottom navigation on /checkout to keep the payment funnel distraction-free', () => {
    mockUsePathname.mockReturnValue('/checkout');
    render(<MobileAppBottomNav />);

    expect(screen.queryByTestId('mobile-app-bottom-nav')).not.toBeInTheDocument();
  });

  it('hides bottom navigation on auth login and signup pages', () => {
    mockUsePathname.mockReturnValue('/auth/login');
    const { rerender } = render(<MobileAppBottomNav />);
    expect(screen.queryByTestId('mobile-app-bottom-nav')).not.toBeInTheDocument();

    mockUsePathname.mockReturnValue('/auth/signup');
    rerender(<MobileAppBottomNav />);
    expect(screen.queryByTestId('mobile-app-bottom-nav')).not.toBeInTheDocument();
  });

  it('hides bottom navigation on specific chef storefront pages where sticky view cart is active', () => {
    mockUsePathname.mockReturnValue('/chefs/every-bite-yum');
    render(<MobileAppBottomNav />);

    expect(screen.queryByTestId('mobile-app-bottom-nav')).not.toBeInTheDocument();
  });

  it('displays the reactive cart count badge when itemCount > 0', () => {
    mockUsePathname.mockReturnValue('/chefs');
    mockUseCart.mockReturnValue({ itemCount: 3 });
    render(<MobileAppBottomNav />);

    const badge = screen.getByTestId('mobile-bottom-nav-cart-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('3');
  });

  it('shows Sign In when unauthenticated and Account when user is logged in', () => {
    mockUsePathname.mockReturnValue('/chefs');
    mockUseAuthContext.mockReturnValue({ user: null });
    const { rerender } = render(<MobileAppBottomNav />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();

    mockUseAuthContext.mockReturnValue({
      user: { id: 'u-1', email: 'customer@example.com' },
    });
    rerender(<MobileAppBottomNav />);

    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('highlights the Saved tab when on /account/favorites', () => {
    mockUsePathname.mockReturnValue('/account/favorites');
    mockUseAuthContext.mockReturnValue({ user: { id: 'u-1' } });
    render(<MobileAppBottomNav />);

    const savedLink = screen.getByRole('link', { name: /saved chefs and favorites/i });
    expect(savedLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the Cart tab when on /cart', () => {
    mockUsePathname.mockReturnValue('/cart');
    render(<MobileAppBottomNav />);

    const cartLink = screen.getByRole('link', { name: /shopping cart/i });
    expect(cartLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the Orders tab when on /account/orders', () => {
    mockUsePathname.mockReturnValue('/account/orders');
    mockUseAuthContext.mockReturnValue({ user: { id: 'u-1' } });
    render(<MobileAppBottomNav />);

    const ordersLink = screen.getByRole('link', { name: /order history and tracking/i });
    expect(ordersLink).toHaveAttribute('aria-current', 'page');
  });
});
