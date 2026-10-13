/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PwaInstallModal } from '../../src/components/layout/pwa-install-modal';

let mockShowIosModal = false;
let mockIsIos = false;
const mockSetShowIosModal = jest.fn();

jest.mock('@/contexts/pwa-install-context', () => ({
  usePwaInstall: () => ({
    triggerInstall: jest.fn(),
    isInstalled: false,
    isInstallable: true,
    isIos: mockIsIos,
    isAndroid: false,
    showIosModal: mockShowIosModal,
    setShowIosModal: mockSetShowIosModal,
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('PwaInstallModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowIosModal = false;
    mockIsIos = false;
  });

  it('renders nothing when showIosModal is false', () => {
    render(<PwaInstallModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with iOS instructions when on iOS', () => {
    mockShowIosModal = true;
    mockIsIos = true;
    render(<PwaInstallModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Tap the Share button/i)).toBeInTheDocument();
    expect(screen.getByText(/Select “Add to Home Screen”/i)).toBeInTheDocument();
  });

  it('renders modal with browser instructions when not on iOS', () => {
    mockShowIosModal = true;
    mockIsIos = false;
    render(<PwaInstallModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Click the Install icon/i)).toBeInTheDocument();
  });

  it('closes modal when clicking Got it or close button', () => {
    mockShowIosModal = true;
    render(<PwaInstallModal />);

    const gotItBtn = screen.getByRole('button', { name: /got it/i });
    fireEvent.click(gotItBtn);

    expect(mockSetShowIosModal).toHaveBeenCalledWith(false);
  });
});
