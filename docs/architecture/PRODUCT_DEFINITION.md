# Ridendine Product Definition

## Overview

Ridendine is a **chef-first food delivery marketplace** that connects home chefs with customers seeking authentic, home-cooked meals. Unlike traditional restaurant delivery platforms, Ridendine is built from the ground up to support independent culinary entrepreneurs operating from home kitchens.

## Core Value Proposition

- **For Customers**: Access to unique, home-cooked meals from local chefs with the convenience of delivery
- **For Chefs**: A platform to monetize culinary skills without restaurant overhead
- **For Drivers**: Flexible delivery opportunities with fair earnings
- **For Operations**: Scalable marketplace with compliance and quality controls

## Platform Surfaces

### 1. Customer Marketplace (apps/web)
The primary customer-facing experience for discovering chefs, browsing menus, placing orders, and managing their account.

### 2. Chef Admin (apps/chef-admin)
The chef's command center for managing their storefront, menu, orders, availability, and business settings.

### 3. Ops Admin (apps/ops-admin)
Internal operations dashboard for chef approvals, order oversight, support escalations, and platform health monitoring.

### 4. Driver App (apps/driver-app)
Driver-facing application for accepting deliveries, navigation, pickup/dropoff confirmation, and earnings tracking.

## User Roles

| Role | Description | Primary Actions |
|------|-------------|-----------------|
| Customer | End user ordering food | Browse, order, review, manage account |
| Chef | Home chef selling meals | Manage menu, fulfill orders, track earnings |
| Driver | Delivery partner | Accept deliveries, pickup/dropoff, track earnings |
| Ops Admin | Platform operator | Approve chefs, handle support, monitor platform |

## Chef-First Architecture Principles

1. `chef_storefronts` is the public-facing listing entity (not restaurants)
2. All menu items belong to chefs through `chef_storefronts`
3. Orders reference chef storefronts, not generic vendors
4. Reviews are chef-specific
5. Delivery zones are chef-defined
6. Availability is chef-controlled

## MVP Launch Scope

### Customer Features
- Chef discovery and search
- Chef storefront browsing
- Menu viewing with options/modifiers
- Cart management
- Checkout and order placement
- Order tracking
- Order history
- Review submission
- Favorites

### Chef Features
- Onboarding flow
- Storefront profile management
- Kitchen settings
- Menu category CRUD
- Menu item CRUD with options
- Availability scheduling
- Order queue management
- Order status updates
- Basic analytics

### Driver Features
- Onboarding status
- Profile and vehicle management
- Online/offline toggle
- Delivery offer queue
- Accept/reject offers
- Active delivery tracking
- Pickup confirmation
- Dropoff confirmation
- Earnings history

### Ops Features
- Chef approval workflow
- Order oversight
- Delivery monitoring
- Support ticket placeholders
- Compliance overview

## V2 Expansion Scope (Post-MVP)

- Stripe Connect for chef payouts
- Advanced analytics and reporting
- Promotional campaigns and promo codes
- Subscription/meal plans
- Chef ratings algorithm
- Driver incentive programs
- Multi-language support
- Native mobile apps
- Real-time chat support
- Advanced search with dietary filters
