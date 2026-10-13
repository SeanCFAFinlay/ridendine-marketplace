/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallAppBanner } from '../../src/components/layout/install-app-banner';

const mockTriggerInstall = jest.fn();
let mockIsInstalled = false;
let mockIsInstallable = true;

jest.mock('@/contexts/pwa-install-context', () => ({
  usePwaInstall: () => ({
    triggerInstall: mockTriggerInstall,
    isInstalled: mockIsInstalled,
    isInstallable: mockIsInstallable,
    isIos: false,
    isAndroid: false,
    showIosModal: false,
    setShowIosModal: jest.fn(),
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('InstallAppBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockIsInstalled = false;
    mockIsInstallable = true;
  });

  it('renders install banner when not installed and not dismissed', () => {
    render(<InstallAppBanner />);

    expect(screen.getByTestId('install-app-banner')).toBeInTheDocument();
    expect(screen.getByText('Get the RideNDine App')).toBeInTheDocument();
  });

  it('triggers install on clicking install button', () => {
    render(<InstallAppBanner />);

    const button = screen.getByRole('button', { name: /install ridendine app/i });
    fireEvent.click(button);

    expect(mockTriggerInstall).toHaveBeenCalledTimes(1);
  });

  it('dismisses banner on clicking dismiss button and persists in sessionStorage', () => {
    render(<InstallAppBanner />);

    const dismissBtn = screen.getByRole('button', { name: /dismiss app install banner/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('install-app-banner')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('ridendine_install_banner_dismissed')).toBe('true');
  });

  it('does not render if already installed', () => {
    mockIsInstalled = true;
    render(<InstallAppBanner />);

    expect(screen.queryByTestId('install-app-banner')).not.toBeInTheDocument();
  });
});
