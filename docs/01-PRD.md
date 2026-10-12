# RideNDine Product Requirements Document (PRD)

> **Document 01 – Product Requirements Document** | Project: RideNDine Marketplace | Date: October 7, 2026 | Commit: `5599c2e5` | Author: AI-generated from codebase audit | Confidence Summary: 46 CONFIRMED / 4 INFERRED / 0 UNKNOWN

---

## 1. Overview

RideNDine is an on-demand, multi-sided food delivery platform that connects independent culinary chefs who prepare fresh, small-batch meals with local diners seeking authentic, non-factory restaurant alternatives `[CONFIRMED: apps/web/src/app/page.tsx#L40-L65]`. The ecosystem operates across four dedicated web applications: a customer discovery marketplace, an operations management command center, a chef kitchen portal, and a driver mobile dispatch Progressive Web App (PWA) `[CONFIRMED: apps/*/package.json]`.

### Target Audience & Users
- **Diners / Consumers:** Local consumers seeking chef-prepared, scratch-cooked ethnic and artisanal meals delivered hot to their doorsteps `[CONFIRMED: apps/web/src/app/page.tsx]`.
- **Independent Chefs / Ghost Kitchens:** Professional home cooks, culinary entrepreneurs, and catering kitchens seeking a turn-key storefront, payment infrastructure, and delivery fleet without predatory aggregate marketplace commissions `[CONFIRMED: apps/chef-admin/src/app/page.tsx]`.
- **Delivery Drivers:** Local courier contractors managing flexible shifts, vehicle availability, order dispatch offers, and earnings payouts `[CONFIRMED: apps/driver-app/src/app/page.tsx]`.
- **Operations & Support Staff:** Central dispatchers, support agents, and finance managers who oversee order fulfillment, manage service level agreements (SLAs), review driver/chef onboarding, and resolve customer issues `[CONFIRMED: apps/ops-admin/src/app/dashboard/page.tsx]`.

### Problem Statement & Value Proposition
Traditional food delivery platforms impose exorbitant commission fees (often 30%+) on small culinary creators while prioritizing mass-market fast-food chains `[INFERRED: platform_settings platform_fee_percent = 15.00%]`. RideNDine provides independent culinary creators with direct access to local markets at a sustainable 15% platform commission, built-in kitchen prep management, integrated delivery dispatch within a 15 km delivery radius, and direct Stripe Connect weekly payouts `[CONFIRMED: packages/db schema platform_settings & apps/chef-admin/src/app/dashboard/payouts/page.tsx]`.

### Public Branding & Positioning
- **Public Name:** RideNDine `[CONFIRMED: apps/web/src/app/layout.tsx#L12]`
- **Official Tagline:** *"Chef-First Food Delivery"* / *"Real Chefs. Real Kitchens."* `[CONFIRMED: apps/web/src/app/page.tsx#L55-L75]`
- **Landing Hero Headline:** *"Find chef-made meals near you."* `[CONFIRMED: apps/web/src/app/page.tsx#L48]`
- **Theme Color Palette:** Primary Brand Orange (`#EA5B26`), Charcoal Ink (`#1A1D20`), Soft Warm Canvas (`#FFF8F5`) `[CONFIRMED: packages/ui/src/styles/tokens.ts & tailwind.config.ts]`.

---

## 2. Product Goals & Outcomes

### Primary Goals
1. **Enable Seamless Multi-Role Fulfillment:** Successfully transition customer orders from initial placement through chef kitchen preparation, automated driver dispatch, live transit, and verified doorstep delivery `[CONFIRMED: packages/engine/src/order-lifecycle.ts]`.
2. **Protect Platform Unit Economics:** Enforce automated mathematical fee splits (15% platform commission, 8% customer service fee, $3.99 base delivery fee, 80% driver delivery payout, 13% Ontario HST) on every transaction `[CONFIRMED: packages/engine/src/pricing-calculator.ts & platform_settings table]`.
3. **Guarantee Delivery Reliability:** Maintain strict automated operational SLAs (5-minute chef acceptance window, 10-minute dispatch escalation timeout, 60-second driver offer acceptance) to minimize order cancellations `[CONFIRMED: platform_settings table & packages/engine/src/sla-monitor.ts]`.

### Secondary Goals
- Provide comprehensive commercial kitchen inventory, recipe batching, and food cost analysis tools for independent chefs `[CONFIRMED: apps/chef-admin/src/app/dashboard/inventory & recipes]`.
- Provide automated Stripe reconciliation, ledger balance verification, and dispute resolution for platform accountants `[CONFIRMED: apps/ops-admin/src/app/dashboard/finance]`.

### Success Metrics Supported in Code
- **Order Conversion & Completion Rate:** Measured via `orders.status` state transitions (`placed` -> `accepted` -> `preparing` -> `ready_for_pickup` -> `picked_up` -> `delivered`) `[CONFIRMED: packages/types/src/orders.ts]`.
- **Delivery Time SLA Compliance:** Recorded in `orders.actual_prep_minutes`, `deliveries.picked_up_at`, and `deliveries.delivered_at` `[CONFIRMED: deliveries table]`.
- **Gross Merchandise Value (GMV) & Net Revenue:** Calculated from `ledger_entries` and `kitchen_daily_summaries` `[CONFIRMED: ledger_entries table]`.
- **System Exception Rate:** Tracked automatically via `order_exceptions` and `system_alerts` tables `[CONFIRMED: order_exceptions table]`.

---

## 3. User Types and Roles

| Role | Description | Access Provisioning | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Anonymous Visitor** | Unauthenticated public visitor exploring the marketplace. | Open web access (`ridendine.ca`). | Browse active chef storefronts, search menus by cuisine, view dishes, add items to cart `[CONFIRMED: apps/web/src/app/page.tsx]`. |
| **Customer** | Authenticated dining customer. | Email/password signup or Google OAuth via Supabase Auth `[CONFIRMED: apps/web/src/app/auth/signup/page.tsx]`. | Save delivery addresses, place orders, complete Stripe checkouts, track live driver map, view history, rate meals `[CONFIRMED: apps/web/src/app/checkout/page.tsx]`. |
| **Chef / Kitchen Partner** | Approved food creator operating a commercial or home kitchen. | Public registration (`chef.ridendine.ca/auth/signup`), verified and approved by Ops Admin `[CONFIRMED: apps/chef-admin/src/app/api/auth/login/route.ts#L46-L60]`. | Manage menus, update inventory/recipes, set hours, accept/reject incoming orders, request weekly Stripe payouts `[CONFIRMED: apps/chef-admin/src/app/dashboard/page.tsx]`. |
| **Delivery Driver** | Fleet courier transporting food from kitchen to customer. | Public registration (`driver.ridendine.ca/auth/signup`), document verification by Ops `[CONFIRMED: apps/driver-app/src/app/page.tsx]`. | Toggle online shifts, receive 60s dispatch offers, follow GPS turn-by-turn routes, upload proof of delivery photo `[CONFIRMED: apps/driver-app/src/components]`. |
| **Ops Agent** | First-line operations dispatcher and support representative. | Created by Super Admin in `platform_users` (`role = 'ops_agent'`) `[CONFIRMED: platform_users table]`. | Monitor live order board, reassign delivery drivers, review incoming tickets, acknowledge SLA warnings `[CONFIRMED: apps/ops-admin/src/app/dashboard]`. |
| **Finance Manager** | Operational accountant overseeing revenue and disbursements. | Created by Super Admin in `platform_users` (`role = 'finance_manager'`) `[CONFIRMED: platform_users table]`. | Run payout batches, view ledger entries, audit Stripe payouts, approve large refund cases `[CONFIRMED: apps/ops-admin/src/app/dashboard/finance]`. |
| **Super Admin** | Platform executive with unrestricted administrative access. | Bootstrapped via CLI script (`scripts/bootstrap-super-admin.mjs`) or `platform_users.role = 'super_admin'` `[CONFIRMED: packages/auth/src/roles.ts]`. | Modify global commission settings, edit delivery radius, promote platform staff, access raw audit logs `[CONFIRMED: apps/ops-admin/src/app/dashboard/settings]`. |
| **API Partner** | External third-party ordering system or point-of-sale integration. | API Key provisioning (`rdk_live_*` / `rdk_test_*`) via Ops Admin `[CONFIRMED: api_partners table]`. | Programmatically inject orders, receive delivery tracking webhooks, query menu catalogs `[CONFIRMED: docs/partner-integration/hoang-gia-pho]`. |

---

## 4. Exhaustive Feature Catalog

| ID | Feature | Description | Expected Behavior | User Role | Status | Source File(s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-001** | Storefront Discovery | Homepage directory of all active kitchens. | Displays featured and open storefronts filtered by 15 km delivery radius; shows cuisine badges, review ratings, and prep estimates. | Public / Customer | Complete | [`apps/web/src/app/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/page.tsx) |
| **F-002** | Menu Browsing | Storefront menu listing categorized by dishes. | Renders categorized menu items with prices, descriptions, allergen tags, daily limits, and availability badges. | Public / Customer | Complete | [`apps/web/src/app/chefs/[slug]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/chefs/[slug]/page.tsx) |
| **F-003** | Dish Customization | Modal to customize dish modifiers and instructions. | Allows selecting required and optional modifier groups (e.g. spice level, sides) with dynamic price calculation. | Public / Customer | Complete | [`apps/web/src/components/dish-detail-modal.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/components/dish-detail-modal.tsx) |
| **F-004** | Client Cart Drawer | Persistent shopping cart for single-storefront orders. | Stores selected items in localStorage and Supabase `carts` table; prevents multi-storefront mixing with warning modal. | Customer | Complete | [`apps/web/src/components/cart/cart-drawer.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/components/cart/cart-drawer.tsx) |
| **F-005** | Delivery Address Validation | Address selection with distance checks. | Geocodes customer address, calculates distance to chef kitchen using Haversine formula; blocks checkout if > 15 km. | Customer | Complete | [`apps/web/src/app/checkout/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/checkout/page.tsx) |
| **F-006** | Stripe Elements Checkout | Secure card payments via Stripe Payment Intents. | Mounts Stripe Payment Element; processes authorization, applies promo codes, handles 3D Secure verification. | Customer | Complete | [`apps/web/src/app/checkout/payment-form.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/checkout/payment-form.tsx) |
| **F-007** | Live Order Tracking | Real-time map and progress status tracker. | Connects via Supabase Realtime to order and delivery updates; shows preparation timeline and live driver map marker. | Customer | Complete | [`apps/web/src/app/orders/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/orders/[id]/page.tsx) |
| **F-008** | Customer Order History | Historical listing of all customer orders. | Displays past orders with re-order button, status breakdown, receipt breakdown, and review submission trigger. | Customer | Complete | [`apps/web/src/app/account/orders/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/account/orders/page.tsx) |
| **F-009** | Customer Profile & Addresses | Saved delivery address management. | Allows adding, editing, and deleting multiple delivery addresses with default selection and buzzer code notes. | Customer | Complete | [`apps/web/src/app/account/addresses/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/account/addresses/page.tsx) |
| **F-010** | Chef Live Action Queue | Real-time incoming order dashboard for kitchens. | Audio ping on new order; displays orders requiring immediate action (Accept/Reject within 5-min SLA window). | Chef | Complete | [`apps/chef-admin/src/app/dashboard/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/page.tsx) |
| **F-011** | Kitchen Prep Management | Interactive order status transition controls. | Allows chefs to mark orders as Preparing, adjust estimated ready time, and trigger "Ready for Pickup" for dispatch. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx) |
| **F-012** | Menu Catalog Editor | Full CRUD menu item and category manager. | Create/edit categories, items, pricing, photos, daily availability caps, and instant "86/Sold Out" toggles. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/menu/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/menu/page.tsx) |
| **F-013** | Storefront Profile Editor | Public storefront branding and operating details. | Configure kitchen name, bio, cuisine categories, cover banner, logo, prep buffer minutes, and pause toggle. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/storefront/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/storefront/page.tsx) |
| **F-014** | Weekly Schedule & Hours | Day-by-day kitchen operating hours scheduler. | Define opening and closing hours per day of week; system automatically reflects open/closed status in marketplace. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/availability/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/availability/page.tsx) |
| **F-015** | Commercial Recipe Scaling | Recipe ingredient tracking and food costing. | Define batch recipes, ingredient quantities, cost per portion, and calculate target profit margins. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/recipes/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/recipes/page.tsx) |
| **F-016** | Raw Inventory Tracking | Stock movements, waste events, and low-stock alerts. | Track supplier items, receiving batches, wastage reasons, and trigger low-stock alerts when portions deplete. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/inventory/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/inventory/page.tsx) |
| **F-017** | Kitchen Stations & Tickets | KDS (Kitchen Display System) station routing. | Routes specific menu items to designated prep stations (e.g. Grill, Fryer, Salad) with ticket timing. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/kitchen/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/kitchen/page.tsx) |
| **F-018** | Stripe Connect Onboarding | Direct chef payout account linking via Stripe Express. | Redirects chef to Stripe Connect onboarding; checks `payouts_enabled` status; displays bank deposit account. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/payouts/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/payouts/page.tsx) |
| **F-019** | Chef Customer Reviews | View customer ratings and feedback. | Displays verified order ratings (1–5 stars) and comments with chef response capabilities. | Chef | Complete | [`apps/chef-admin/src/app/dashboard/reviews/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/app/dashboard/reviews/page.tsx) |
| **F-020** | Driver Shift Toggle | Online / Offline shift presence manager. | Toggles driver availability in `driver_presence`; captures battery level, current location, and vehicle type. | Driver | Complete | [`apps/driver-app/src/app/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/app/page.tsx) |
| **F-021** | 60-Second Dispatch Offer | Timed modal offering order delivery to nearest driver. | Displays pickup location, delivery address, estimated payout, distance; auto-expires in 60 seconds if unaccepted. | Driver | Complete | [`apps/driver-app/src/components/delivery/dispatch-offer-modal.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/components/delivery/dispatch-offer-modal.tsx) |
| **F-022** | Turn-by-Turn Navigation | In-app Leaflet routing map. | Displays route line between driver, kitchen, and customer; provides direct deep-link to Google Maps / Apple Maps. | Driver | Complete | [`apps/driver-app/src/components/map/route-map.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/components/map/route-map.tsx) |
| **F-023** | Order Pickup Verification | Kitchen pickup confirmation step. | Driver verifies customer name, order number, and item pack checklist before confirming pickup. | Driver | Complete | [`apps/driver-app/src/app/deliveries/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/app/deliveries/[id]/page.tsx) |
| **F-024** | Doorstep Delivery Proof | Completion step with photo upload and drop notes. | Captures delivery timestamp, optional doorstep photo uploaded to Supabase Storage, and customer delivery notes. | Driver | Complete | [`apps/driver-app/src/app/deliveries/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/app/deliveries/[id]/page.tsx) |
| **F-025** | Driver Earnings Ledger | Daily and weekly payout breakdown for drivers. | Displays completed trips, base delivery pay, customer tips, and weekly payout settlement status. | Driver | Complete | [`apps/driver-app/src/app/earnings/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/app/earnings/page.tsx) |
| **F-026** | Driver Document Submission | Driver license, insurance, and vehicle upload. | Form to upload vehicle registration and driver's license with expiration dates for ops approval. | Driver | Complete | [`apps/driver-app/src/app/documents/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/app/documents/page.tsx) |
| **F-027** | Ops Live Board | Master operational command center. | Real-time kanban swimlanes displaying all orders grouped by lifecycle state; color-coded SLA timers. | Ops / Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/page.tsx) |
| **F-028** | Manual Dispatch Override | Force-assign or reassign driver to delivery. | Overrides automated dispatch algorithm; allows dispatcher to pick an available driver from live fleet list. | Ops / Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx) |
| **F-029** | Chef Onboarding Review | Kitchen document verification and store approval. | Ops reviews kitchen inspections, food handler certificates, Stripe status, and toggles storefront publication. | Ops / Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/chefs/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/chefs/page.tsx) |
| **F-030** | Driver Verification Review | Driver license & vehicle validation portal. | Ops inspects driver background documents, verifies insurance dates, and marks driver status as `approved`. | Ops / Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/drivers/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/drivers/page.tsx) |
| **F-031** | Fleet Live Map | Real-time geographical map of all online drivers. | Displays all active drivers on Leaflet map with status pills (Idle, On Offer, En Route to Kitchen, Delivering). | Ops / Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/dispatch/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/dispatch/page.tsx) |
| **F-032** | Financial Ledger Audit | Double-entry accounting transaction view. | Detailed audit of all debit/credit movements across customer payments, platform fees, driver fees, and chef payouts. | Finance / Admin | Complete | [`apps/ops-admin/src/app/dashboard/ledger/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/ledger/page.tsx) |
| **F-033** | Payout Run Execution | Batch processor for weekly chef and driver transfers. | Aggregates unpaid completed orders, calculates net payout amounts, and triggers Stripe Connect transfer batch. | Finance / Admin | Complete | [`apps/ops-admin/src/app/dashboard/payouts/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/payouts/page.tsx) |
| **F-034** | Customer Support Tickets | Incident tracking for delayed or missing food. | Centralized ticket inbox for customer complaints, missing items, cold food, or delivery driver disputes. | Support / Ops | Complete | [`apps/ops-admin/src/app/dashboard/support/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/support/page.tsx) |
| **F-035** | Refund Case Adjudication | Managed refund processing with threshold limits. | Allows support agents to issue partial/full refunds via Stripe; auto-approves requests below $25 threshold. | Support / Ops | Complete | [`apps/ops-admin/src/app/dashboard/support/[id]/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/support/[id]/page.tsx) |
| **F-036** | Global Platform Settings | Operational configuration variables management. | Live editing of commission percentage, tax rate, delivery radius, base delivery fee, and timeout limits. | Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/settings/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/settings/page.tsx) |
| **F-037** | Operational Audit Log | Tamper-evident administrative action log. | Displays immutable log of every status override, user promotion, refund approval, and rate adjustment. | Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/audit/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/audit/page.tsx) |
| **F-038** | Partner API Keys | API credential generator for external partners. | Generates scoped live (`rdk_live_*`) and test (`rdk_test_*`) tokens for partner kitchen point-of-sale systems. | Super Admin | Complete | [`apps/ops-admin/src/app/dashboard/integrations/page.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/app/dashboard/integrations/page.tsx) |
| **F-039** | Automated SLA Monitor | Background cron monitoring order timeouts. | Scans active orders; escalates unaccepted orders at 5 mins; triggers auto-dispatch at 10 mins; issues system alerts. | System Cron | Complete | [`packages/engine/src/sla-monitor.ts & scripts/local-cron.mjs`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/src/sla-monitor.ts) |
| **F-040** | Automated Dispatch Engine | Driver matching algorithm based on proximity. | Identifies online drivers within 15 km with active shift; scores by distance; creates cascading assignment attempts. | System Engine | Complete | [`packages/engine/src/dispatch-engine.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/src/dispatch-engine.ts) |
| **F-041** | Stripe Webhook Processing | Inbound payment event lifecycle listener. | Processes `payment_intent.succeeded`, `charge.refunded`, and `account.updated`; updates order and chef records. | Inbound Webhook | Complete | [`apps/web/src/app/api/webhooks/stripe/route.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/src/app/api/webhooks/stripe/route.ts) |
| **F-042** | Customer Order Notifications | Email notifications on order state changes. | Sends transactional receipt, order accepted, food en route, and delivered confirmation emails via Resend. | System Engine | Complete | [`packages/notifications/src/email.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/notifications/src/email.ts) |
| **F-043** | Storefront Auto-Pause | Circuit breaker for overloaded kitchens. | Auto-pauses storefront when queue exceeds `max_queue_size` (10 orders) or chef repeatedly breaches acceptance SLA. | System Engine | Complete | [`packages/engine/src/storefront-guard.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/src/storefront-guard.ts) |
| **F-044** | Loyalty Points System | Customer rewards accrual on orders. | Awards loyalty points per dollar spent; records balance in `loyalty_accounts` and movements in `loyalty_transactions`. | Customer | Complete | [`packages/db schema loyalty_accounts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/db) |
| **F-045** | Promo Code Engine | Discount validation at checkout. | Validates coupon code limits, expiration dates, min order amounts, and applies percentage or fixed discounts. | Customer | Complete | [`packages/engine/src/pricing-calculator.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/src/pricing-calculator.ts) |

---

## 5. Content Inventory

| Page / Section | Main Content Type | Source Location | Update Mechanism |
| :--- | :--- | :--- | :--- |
| **Marketplace Landing** (`/`) | Static Marketing Copy & Dynamic Kitchen Cards | Hardcoded in `apps/web/src/app/page.tsx` & Database (`chef_storefronts`) | Code deployments for copy; Ops/Chef dashboard for storefront cards |
| **Storefront & Menu** (`/chefs/[slug]`) | Dynamic Catalog Data & User Uploads | Database (`chef_storefronts`, `menu_categories`, `menu_items`) | Chef Admin portal editing |
| **Dish Modifiers** | Dynamic Pricing & Option Rules | Database (`menu_item_options`, `menu_item_option_values`) | Chef Admin portal editing |
| **Legal Pages** (`/privacy`, `/terms`) | Static Legal Text | Hardcoded TSX copy in `apps/web/src/app/privacy/page.tsx` & `terms/page.tsx` | Git code release |
| **Ops Live Board** (`/dashboard`) | Live Operational Data Stream | Database (`orders`, `deliveries`, `system_alerts`) | Supabase Realtime subscriptions & REST API polling |
| **Driver Dashboard** (`/`) | Real-Time Shift & Dispatch Data | Database (`driver_shifts`, `assignment_attempts`, `deliveries`) | Supabase Realtime WebSocket |
| **Help & FAQ** (`/faq`) | Static Support Articles | Hardcoded in `apps/web/src/app/faq/page.tsx` | Git code release |

---

## 6. Business Rules and Validation

### Financial Calculation Formula `[CONFIRMED: packages/engine/src/pricing-calculator.ts]`
For every placed customer order:
1. **Subtotal ($S$):** $\sum (\text{item\_price} \times \text{quantity} + \text{modifier\_prices})$
2. **Platform Commission:** $S \times 0.15$ (deducted from Chef earnings)
3. **Customer Service Fee:** $S \times 0.08$ (added to customer bill)
4. **Base Delivery Fee:** Fixed at **$3.99** (when distance $\le 5\text{ km}$; incremental per-km charges apply beyond 5 km)
5. **Driver Payout:** $80\%$ of total delivery fee + $100\%$ of customer tip
6. **Harmonized Sales Tax (HST):** $(S + \text{service\_fee} + \text{delivery\_fee}) \times 0.13$ (13% Ontario standard)
7. **Total Charged to Customer:** $S + \text{service\_fee} + \text{delivery\_fee} + \text{tip} + \text{HST} - \text{discounts}$

### Operational Constraints & Limits `[CONFIRMED: platform_settings table]`
- **Maximum Delivery Radius:** 15.00 km (hard boundary: 15.10 km)
- **Minimum Order Amount:** $10.00 standard (configurable up to $20.00 per storefront)
- **Chef Order Acceptance SLA:** 5 minutes (triggers alert if exceeded)
- **Dispatch Auto-Escalation SLA:** 10 minutes (triggers ops intervention alert if unassigned)
- **Driver Offer Expiration:** 60 seconds (unaccepted offers cycle to next nearest driver)
- **Maximum Driver Assignment Attempts:** 5 attempts before dispatch failure state
- **Customer Refund Window:** 24 hours post-delivery
- **Automated Refund Approval Threshold:** $25.00 (refunds $\le \$25$ auto-approved without ops review)
- **Kitchen Overload Guard:** 10 concurrent active orders triggers auto-pause recommendation

---

## 7. Notifications and Communications

| Trigger Event | Channel | Recipient | Content / Purpose | Implementation File |
| :--- | :--- | :--- | :--- | :--- |
| **Order Placed** | Email | Customer | Itemized order confirmation, receipt, estimated prep time | [`packages/notifications/src/email.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/notifications/src/email.ts) |
| **New Order Pending** | Web Audio & Realtime | Chef | Audible chime and banner in Chef Admin queue | [`apps/chef-admin/src/components/orders/audio-alert.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/chef-admin/src/components/orders/audio-alert.tsx) |
| **Driver Offer Dispatched** | In-App / Push | Driver | Sound notification, offer details, 60-second acceptance timer | [`apps/driver-app/src/components/delivery/dispatch-offer-modal.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/driver-app/src/components/delivery/dispatch-offer-modal.tsx) |
| **Food Picked Up** | Email & In-App | Customer | Notice that driver has collected food and is en route with live map | [`packages/notifications/src/email.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/notifications/src/email.ts) |
| **Order Delivered** | Email & Push | Customer | Delivery completion notification with doorstep photo link | [`packages/notifications/src/email.ts`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/notifications/src/email.ts) |
| **SLA Warning / Breach** | In-App / System Alert | Ops Dispatcher | Visual flashing alert on Ops Live Board for orders pending > 5 min | [`apps/ops-admin/src/components/alerts/system-alerts-banner.tsx`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/src/components/alerts/system-alerts-banner.tsx) |

---

## 8. Non-Functional Expectations in Code

1. **Security & Content Security Policy:**
   - Strict Level 3 Content Security Policy configured with per-request dynamic cryptographic nonces (`'nonce-${nonce}'` and `'strict-dynamic'`) preventing unauthorized XSS execution `[CONFIRMED: packages/auth/src/csp.ts]`.
   - Dynamic server rendering enforced across all application root and auth layouts (`export const dynamic = 'force-dynamic'`) to ensure 100% of injected scripts match the CSP header `[CONFIRMED: apps/*/src/app/layout.tsx]`.
2. **Mobile Responsiveness & Viewports:**
   - Explicit Next.js Viewport metadata exported on all applications (`width: 'device-width', initialScale: 1, maximumScale: 5, themeColor: '#EA5B26'`) ensuring responsive scaling on iOS Safari and Android Chrome `[CONFIRMED: apps/*/src/app/layout.tsx]`.
   - Verified zero horizontal pixel overflow at mobile (390×844) and desktop (1440×900) resolutions `[CONFIRMED: scripts/smoke/responsive-production-smoke.cjs]`.
3. **Data Integrity & Hygiene:**
   - Automated database hygiene verification scripts (`verify-prod-data-hygiene.mjs`) prevent accidental seed or reset scripts from executing in CI/CD environments `[CONFIRMED: scripts/verify-prod-data-hygiene.mjs]`.
   - Atomic database purge tool (`scripts/purge-demo-data.mjs`) allows clean production slate initialization without disrupting operational platform settings `[CONFIRMED: scripts/purge-demo-data.mjs]`.

---

## 9. Out of Scope / Planned / Stubs

1. **Native Mobile App Store Packages (iOS/Android):**
   - The Driver App is currently built and deployed as a responsive web PWA (Progressive Web App) with mobile service worker support; native Swift/Kotlin binaries are not present `[CONFIRMED: apps/driver-app/public/manifest.json]`.
2. **Autonomous Drone / Robot Delivery:**
   - Delivery dispatch is exclusively architected for vehicle and bicycle couriers tracked via browser Geolocation API `[CONFIRMED: apps/driver-app/src/components/map]`.
3. **Multi-Region Currency Conversion:**
   - Financial ledger, pricing calculator, and Stripe integrations are strictly configured for Canadian Dollars (CAD) with 13% Ontario HST `[CONFIRMED: packages/engine/src/pricing-calculator.ts]`.
