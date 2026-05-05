# Ridéndine Master Wiring Diagram

## System Diagram

```mermaid
flowchart TB
  Web["apps/web customer"] --> WebApi["Customer APIs"]
  Chef["apps/chef-admin"] --> ChefApi["Chef APIs"]
  Driver["apps/driver-app"] --> DriverApi["Driver APIs"]
  Ops["apps/ops-admin"] --> OpsApi["Ops APIs"]
  WebApi --> DB["Supabase DB/Auth"]
  ChefApi --> DB
  DriverApi --> DB
  OpsApi --> DB
  WebApi --> Stripe["Stripe"]
  OpsApi --> Stripe
  DriverApi --> Routing["packages/routing / provider"]
  OpsApi --> Engine["packages/engine"]
  ChefApi --> Engine
  WebApi --> Engine
  DriverApi --> Engine
  Engine --> Types["packages/types"]
  Engine --> Validation["packages/validation"]
```

## Route Map

Detected page routes: 80. Customer Web: 24, Ops Admin: 36, Chef Admin: 12, Driver App: 8.

```mermaid
flowchart LR
  WebRoutes["apps/web routes"] --> CustomerApis["Customer APIs"]
  ChefRoutes["chef-admin routes"] --> ChefApis["Chef APIs"]
  DriverRoutes["driver-app routes"] --> DriverApis["Driver APIs"]
  OpsRoutes["ops-admin routes"] --> OpsApis["Ops APIs"]
```

## API Map

Detected API route files: 89. Customer Web: 18, Ops Admin: 46, Chef Admin: 13, Driver App: 12.

```mermaid
flowchart TB
  APIs["apps/*/src/app/api"] --> Auth["Auth checks where detected"]
  APIs --> Validation["Schemas / safeParse where detected"]
  APIs --> Engine["Engine/services/packages"]
  APIs --> Tables["Supabase tables/RPCs"]
  APIs --> External["Stripe/routing/Supabase external clients"]
```

## Order Lifecycle Map

```mermaid
flowchart LR
  Browse --> Cart --> Checkout --> OrdersTable["orders"]
  OrdersTable --> ChefQueue --> Dispatch --> DriverDelivery --> Tracking --> Completed
```

## Finance Lifecycle Map

```mermaid
flowchart LR
  StripePayment --> OrderPaymentStatus --> Ledger --> ChefPayout --> DriverPayout --> Reconciliation --> Audit
```

## Realtime State Map

```mermaid
flowchart LR
  EngineEvents --> Sanitizer["public broadcast sanitizer"]
  Sanitizer --> CustomerTracking
  Sanitizer --> OpsLiveBoard
  EngineEvents --> ChefQueue
  EngineEvents --> DriverOfferDeliveryState
```

## App Dependency Map

```mermaid
flowchart TB
  UI["@ridendine/ui"] --> Web
  UI --> Chef
  UI --> Driver
  UI --> Ops
  DB["@ridendine/db"] --> Web
  DB --> Chef
  DB --> Driver
  DB --> Ops
  Engine["@ridendine/engine"] --> Ops
  Engine --> Web
  Routing["@ridendine/routing"] --> Driver
  Routing --> Ops
```
