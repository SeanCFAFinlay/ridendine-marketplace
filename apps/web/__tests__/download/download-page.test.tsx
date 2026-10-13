/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DownloadPage from '../../src/app/download/page';

const mockTriggerInstall = jest.fn();

jest.mock('@/contexts/pwa-install-context', () => ({
  usePwaInstall: () => ({
    triggerInstall: mockTriggerInstall,
    isInstalled: false,
    isInstallable: true,
    isIos: false,
    isAndroid: false,
    showIosModal: false,
    setShowIosModal: jest.fn(),
  }),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('DownloadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and all three app download cards', () => {
    render(<DownloadPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Download the RideNDine Apps/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /RideNDine Customer App/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /RideNDine Courier Driver/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Chef Kitchen & KDS App/i })).toBeInTheDocument();
  });

  it('triggers install when clicking Install Customer App', () => {
    render(<DownloadPage />);

    const installBtn = screen.getByRole('button', { name: /Install Customer App/i });
    fireEvent.click(installBtn);

    expect(mockTriggerInstall).toHaveBeenCalledTimes(1);
  });

  it('links to driver and chef subdomains', () => {
    render(<DownloadPage />);

    const driverLink = screen.getByRole('link', { name: /Open Driver App/i });
    expect(driverLink).toHaveAttribute('href', 'https://driver.ridendine.ca');

    const chefLink = screen.getByRole('link', { name: /Open Kitchen App/i });
    expect(chefLink).toHaveAttribute('href', 'https://chef.ridendine.ca');
  });

  it('renders device installation guides for iOS and Android', () => {
    render(<DownloadPage />);

    expect(screen.getByText(/iOS \(iPhone & iPad\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Android & Chrome/i)).toBeInTheDocument();
  });
});
