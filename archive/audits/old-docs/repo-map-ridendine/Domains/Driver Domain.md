# Driver Domain

> Everything related to driver functionality — login, delivery, tracking, earnings.

## Ownership

- **Primary App**: `apps/driver-app` (port 3003, PWA)
- **DB Tables**: `drivers`, `driver_documents`, `driver_vehicles`, `driver_shifts`, `driver_presence`, `driver_locations`, `driver_earnings`, `driver_payouts`, `deliveries`, `delivery_tracking_events`, `assignment_attempts`
- **Repositories**: `driver.repository.ts`, `driver-presence.repository.ts`, `delivery.repository.ts`
- **Engine**: `DispatchEngine`, `PlatformWorkflowEngine`
- **Validation**: `driver.ts` schemas

## Driver Lifecycle

```
Created by Ops/Seed → Status: pending → Ops Approves → Status: approved → Can Login
```

**No driver self-signup exists in the app.** The driver login page links to an external URL (ridendine.ca/driver-signup).

## Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/auth/login` | Driver login (checks approved status) | Connected |
| `/` | Dashboard: online toggle, active delivery, quick actions | Connected |
| `/delivery/[id]` | Active delivery: 6-step progress, navigation, completion | Connected |
| `/earnings` | Weekly bar chart, today's deliveries, next payout | Connected |
| `/history` | Grouped delivery history | Connected |
| `/profile` | Edit name/phone, view status, logout | Connected |

## Key Components

| Component | Role | Features |
|-----------|------|----------|
| `DriverDashboard` | Main screen | Online/offline toggle, active delivery card, today stats, bottom nav |
| `DeliveryDetail` | Active delivery | 6-step progress, Google Maps navigation, photo capture, signature canvas |
| `EarningsView` | Earnings display | Weekly bar chart, today's list, payout info |
| `HistoryView` | Delivery history | Grouped by date, status badges |
| `ProfileView` | Profile edit | Edit mode, logout |
| `RouteMap` | Leaflet map | Pickup/dropoff/driver markers, dashed route line |

## Delivery Flow

```
Offer received (assignment_attempts) 
  → Accept offer → status: assigned
  → En route to pickup → Open Google Maps
  → Arrived at pickup
  → Picked up
  → En route to dropoff → Open Google Maps  
  → Arrived at dropoff
  → Delivered (photo + signature → completion modal)
  → Auto: order completed + ledger entries created
```

## Location Tracking

**Hook**: `useLocationTracker` (`src/hooks/use-location-tracker.ts`)
- Uses `navigator.geolocation.watchPosition()` with high accuracy
- Updates every 15 seconds
- Writes to: `driver_presence` (current), `driver_locations` (history)
- If active delivery: also writes `delivery_tracking_events` + emits event

**API**: POST `/api/location`
- Rate limited: 5 seconds per driver (in-memory)
- Validates via `locationUpdateSchema`
- Emits `driver_location_updated` event via engine

## Online/Offline State

- Toggled in DriverDashboard via PATCH `/api/driver/presence`
- Updates `driver_presence.status` (offline/online/busy)
- Going offline with active delivery creates an exception via engine
- Engine audit logs status changes

## Gaps

| Gap | Details |
|-----|---------|
| No driver signup | Must be created by ops or database seed |
| `driver_documents` | Schema exists, no upload/review UI |
| `driver_vehicles` | Seeded, displayed in ops, no CRUD UI |
| `driver_shifts` | Schema exists, not actively created |
| `driver_earnings` | Schema exists, earnings calculated from deliveries instead |
| PWA incomplete | Manifest referenced but not found, no service worker |
| Today stats hardcoded | Dashboard shows `{deliveries: 0, earnings: 0, hours: 0}` |
| Offline support | No service worker or cache strategy |
