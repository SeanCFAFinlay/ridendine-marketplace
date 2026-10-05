/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

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
    layerGroup: jest.fn(() => mockLayerGroup),
    latLng: jest.fn((lat, lng) => ({ lat, lng })),
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
  layerGroup: jest.fn(() => mockLayerGroup),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  divIcon: jest.fn((opts) => opts),
  marker: jest.fn(() => mockMarker),
}));

jest.mock('leaflet/dist/leaflet.css', () => ({}));

import OrderTrackingMap from '../../src/components/tracking/order-tracking-map';

describe('OrderTrackingMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders destination accessible text and map container', () => {
    render(
      <OrderTrackingMap
        polyline={null}
        progressPct={0}
        etaDropoffAt={null}
        dropoffAddress="123 King St W"
      />
    );

    expect(screen.getByText('Deliver to 123 King St W')).toBeInTheDocument();
  });

  it('displays formatted ETA when etaDropoffAt is provided', () => {
    render(
      <OrderTrackingMap
        polyline={null}
        progressPct={50}
        etaDropoffAt="2026-10-05T18:30:00Z"
        dropoffAddress="123 King St W"
      />
    );

    expect(screen.getByText(/ETA:/)).toBeInTheDocument();
  });

  it('creates pickup, dropoff, and courier markers when polyline is decoded', () => {
    // Encoded polyline representing two coordinates: (43.255, -79.869) to (43.254, -79.866)
    // encoded string: 'k_reGzklnNj@q@'
    const testPolyline = 'k_reGzklnNj@q@';
    render(
      <OrderTrackingMap
        polyline={testPolyline}
        progressPct={50}
        etaDropoffAt="2026-10-05T18:30:00Z"
        dropoffAddress="100 Main St E"
      />
    );

    // Verify layerGroup created and layers added
    expect(mockLayerGroup.addTo).toHaveBeenCalled();
    expect(mockLayerGroupAddLayer).toHaveBeenCalled();
  });
});
