/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Leaflet for JSDOM
const mockTileLayerAddTo = jest.fn();
const mockLayerGroupClearLayers = jest.fn();
const mockLayerGroupAddLayer = jest.fn();
const mockLayerGroup = {
  addTo: jest.fn().mockReturnThis(),
  clearLayers: mockLayerGroupClearLayers,
  addLayer: mockLayerGroupAddLayer,
};
const mockPolylineAddTo = jest.fn();
const mockPolyline = {
  addTo: mockPolylineAddTo.mockReturnThis(),
  getBounds: jest.fn().mockReturnValue({}),
};
const mockMarker = {
  bindPopup: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
};

jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    map: jest.fn(() => ({
      setView: jest.fn().mockReturnThis(),
      remove: jest.fn(),
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({
      addTo: mockTileLayerAddTo,
    })),
    polyline: jest.fn(() => mockPolyline),
    circleMarker: jest.fn(() => mockMarker),
    layerGroup: jest.fn(() => mockLayerGroup),
    latLng: jest.fn((lat, lng) => ({ lat, lng })),
    latLngBounds: jest.fn(() => ({})),
    divIcon: jest.fn((opts) => opts),
    marker: jest.fn(() => mockMarker),
  },
  map: jest.fn(() => ({
    setView: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: mockTileLayerAddTo,
  })),
  polyline: jest.fn(() => mockPolyline),
  circleMarker: jest.fn(() => mockMarker),
  layerGroup: jest.fn(() => mockLayerGroup),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn(() => ({})),
  divIcon: jest.fn((opts) => opts),
  marker: jest.fn(() => mockMarker),
}));

jest.mock('leaflet/dist/leaflet.css', () => ({}));

import { DeliveryMap } from '../map/delivery-map';
import { DeliveryDetailMap } from '../map/delivery-detail-map';

describe('DeliveryMap', () => {
  const sampleDeliveries = [
    {
      id: 'del-101',
      order_number: 'RD-101',
      status: 'en_route_to_pickup',
      pickup_lat: 43.255,
      pickup_lng: -79.869,
      pickup_address: '10 King St W, Hamilton, ON',
      dropoff_lat: 43.254,
      dropoff_lng: -79.866,
      dropoff_address: '100 Main St E, Hamilton, ON',
      driver_name: 'Alex Driver',
      route_polyline: 'k_reGzklnNj@q@',
    },
  ];

  const sampleDriverPins = [
    {
      id: 'drv-1',
      lat: 43.256,
      lng: -79.870,
      label: 'Alex Driver',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header stats and map view toggle', () => {
    render(<DeliveryMap deliveries={sampleDeliveries} driverPins={sampleDriverPins} />);

    expect(screen.getByText('Live Coordinate & Route Map')).toBeInTheDocument();
    expect(screen.getByText(/1 deliveries · 1 drivers/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
  });

  it('switches between Map and List views upon toggle', () => {
    const onDeliveryClick = jest.fn();
    render(
      <DeliveryMap
        deliveries={sampleDeliveries}
        driverPins={sampleDriverPins}
        onDeliveryClick={onDeliveryClick}
      />
    );

    // Switch to List view
    fireEvent.click(screen.getByRole('button', { name: 'List' }));

    // In List view, delivery address cards are rendered
    expect(screen.getByText('10 King St W, Hamilton, ON')).toBeInTheDocument();
    expect(screen.getByText('100 Main St E, Hamilton, ON')).toBeInTheDocument();

    // Clicking delivery card in list view triggers callback
    fireEvent.click(screen.getByText('RD-101'));
    expect(onDeliveryClick).toHaveBeenCalledWith('del-101');
  });

  it('shows empty state when no deliveries or driver pins exist', () => {
    render(<DeliveryMap deliveries={[]} driverPins={[]} />);
    expect(screen.getByText('No delivery or driver coordinates available.')).toBeInTheDocument();
  });
});

describe('DeliveryDetailMap', () => {
  const sampleBreadcrumbs = [
    {
      id: 'crumb-1',
      lat: 43.2551,
      lng: -79.8691,
      recordedAt: '2026-10-05T12:00:00Z',
    },
    {
      id: 'crumb-2',
      lat: 43.2553,
      lng: -79.8685,
      recordedAt: '2026-10-05T12:02:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders route and breadcrumb telemetry header with count', () => {
    render(
      <DeliveryDetailMap
        pickup={{ address: '10 King St W', lat: 43.255, lng: -79.869 }}
        dropoff={{ address: '100 Main St E', lat: 43.254, lng: -79.866 }}
        trackingBreadcrumbs={sampleBreadcrumbs}
        driverName="Sarah Connor"
        status="en_route_to_dropoff"
      />
    );

    expect(screen.getByText('Route & Driver GPS Trail')).toBeInTheDocument();
    expect(screen.getByText('2 breadcrumb pings')).toBeInTheDocument();
    expect(screen.getByText('Driver: Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('en_route_to_dropoff')).toBeInTheDocument();
  });

  it('renders awaiting message when no breadcrumbs exist yet', () => {
    render(
      <DeliveryDetailMap
        pickup={{ address: '10 King St W', lat: 43.255, lng: -79.869 }}
        dropoff={{ address: '100 Main St E', lat: 43.254, lng: -79.866 }}
        trackingBreadcrumbs={[]}
      />
    );

    expect(screen.getByText('Awaiting live driver GPS breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('0 breadcrumb pings')).toBeInTheDocument();
  });
});
