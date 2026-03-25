# Ops-Admin Command Center Plan

## Vision

The Ops-Admin dashboard is the **central nervous system** of the Ridendine platform. It provides operational teams with complete visibility and control over all marketplace activities.

---

## Current State (Post-Audit)

### Implemented Features

| Domain | List View | Detail View | Actions | Status |
|--------|-----------|-------------|---------|--------|
| Overview | ✅ Real-time stats, alerts, charts | - | Quick links | Working |
| Orders | ✅ Recent 50 orders | ✅ Full order details | View | Working |
| Deliveries | ✅ Active deliveries | ✅ Full delivery details | View | Working |
| Chefs | ✅ All chefs | ✅ Chef profile | View, Suspend | Working |
| Chef Approvals | ✅ Pending chefs | - | Approve/Reject | Working |
| Drivers | ✅ All drivers | ✅ Driver profile | View, Approve/Suspend | Working |
| Customers | ✅ All customers | ✅ Customer profile | View | Working |
| Support | ✅ All tickets | - | Resolve | Working |
| Live Map | ✅ Driver locations | - | Filter by status | Working |
| Analytics | ✅ Key metrics | - | - | Working |
| Settings | ✅ Platform config | - | Save (mock) | Working |

### Navigation Structure

```
📊 Overview (Command Center Home)
🗺️ Live Map
📦 Orders
🚗 Deliveries
👨‍🍳 Chefs
✅ Chef Approvals
🚚 Drivers
👥 Customers
💬 Support
📈 Analytics
⚙️ Settings
```

---

## Architecture Recommendations

### 1. Service Layer Pattern

Create dedicated service modules for admin operations:

```
apps/ops-admin/src/services/
├── admin-orders.service.ts    # Order operations
├── admin-chefs.service.ts     # Chef management
├── admin-drivers.service.ts   # Driver management
├── admin-deliveries.service.ts # Delivery operations
├── admin-customers.service.ts # Customer operations
├── admin-support.service.ts   # Support ticket handling
├── admin-analytics.service.ts # Metrics & reporting
└── admin-settings.service.ts  # Platform configuration
```

### 2. Real-time Subscriptions

Use Supabase real-time for live updates:

```typescript
// Example subscription setup
const ordersChannel = supabase
  .channel('orders-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => refreshOrders()
  )
  .subscribe();
```

### 3. State Management

For complex state, consider:
- React Query for server state
- Zustand for UI state
- Context for auth/user state

---

## Priority Admin Capabilities

### Tier 1: Operational Essentials (Current)
- [x] Dashboard overview with KPIs
- [x] Order visibility and detail
- [x] Delivery tracking
- [x] Chef/driver management
- [x] Live map
- [x] Support tickets

### Tier 2: Enhanced Operations (Next)
- [ ] Pagination and search across all lists
- [ ] Status change with confirmation dialogs
- [ ] Bulk actions (approve multiple, export)
- [ ] Order intervention (refund, reassign)
- [ ] Driver assignment for deliveries

### Tier 3: Advanced Features (Future)
- [ ] Financial dashboard and payout management
- [ ] Audit logs with filtering
- [ ] Customer disputes and refunds
- [ ] Platform announcements
- [ ] A/B testing controls
- [ ] Feature flags management

---

## Data Requirements

### Real-time Data
- Active order count
- Active delivery count
- Online driver count
- Pending approvals count
- System alerts

### Periodic Refresh (1-5 min)
- Revenue metrics
- Order statistics
- Delivery performance
- Driver availability

### On-demand Data
- Historical reports
- Export data
- Audit logs

---

## API Endpoints Required

### Orders
```
GET    /api/orders              - List with pagination
GET    /api/orders/:id          - Detail
PATCH  /api/orders/:id          - Update status
POST   /api/orders/:id/refund   - Issue refund
```

### Deliveries
```
GET    /api/deliveries          - List with filters
GET    /api/deliveries/:id      - Detail
PATCH  /api/deliveries/:id      - Update status
POST   /api/deliveries/:id/assign - Assign driver
```

### Chefs
```
GET    /api/chefs               - List with status filter
GET    /api/chefs/:id           - Detail
PATCH  /api/chefs/:id           - Update status
POST   /api/chefs/:id/approve   - Approve
POST   /api/chefs/:id/suspend   - Suspend
```

### Drivers
```
GET    /api/drivers             - List with status filter
GET    /api/drivers/:id         - Detail
PATCH  /api/drivers/:id         - Update status
POST   /api/drivers/:id/approve - Approve
```

### Analytics
```
GET    /api/analytics/overview  - Dashboard metrics
GET    /api/analytics/orders    - Order analytics
GET    /api/analytics/revenue   - Revenue metrics
GET    /api/analytics/performance - Platform performance
```

### Settings
```
GET    /api/settings            - Get platform settings
PATCH  /api/settings            - Update settings
```

---

## UI/UX Guidelines

### Design Principles
1. **Information Density**: Show relevant data without overwhelming
2. **Clear Hierarchy**: Important metrics first
3. **Actionable**: Every view should lead to an action
4. **Responsive**: Work on desktop and tablet
5. **Real-time**: Show live data where possible

### Color Coding
- Green: Success, Active, Online
- Yellow: Warning, Pending
- Orange: In Progress, Busy
- Red: Error, Failed, Suspended
- Blue: Info, New

### Navigation Rules
- Overview → List → Detail flow
- Back links on all detail pages
- Quick actions visible on hover
- Breadcrumbs for deep navigation

---

## Security Considerations

### Authentication
- Ops admin users in `platform_users` table
- Role: `ops_admin`
- Session-based auth via Supabase

### Authorization
- All admin routes protected by middleware
- RLS policies using `is_ops_admin()` function
- Action logging for audit trail

### Data Access
- Full read access to all platform data
- Write access limited to status changes
- Sensitive data (payments) may require additional roles

---

## Future Enhancements

### Phase 2: Intelligence
- Anomaly detection alerts
- Fraud detection
- Performance predictions
- Automated driver assignment

### Phase 3: Automation
- Automated refunds for failed deliveries
- Chef quality scoring
- Driver performance ratings
- Dynamic pricing controls

### Phase 4: Integration
- External notification services
- Payment provider dashboards
- Customer support tools (Zendesk, Intercom)
- Analytics platforms (Mixpanel, Amplitude)

---

## Success Metrics

The command center is successful when:
1. **Response Time**: Ops can find any order in < 30 seconds
2. **Visibility**: All platform activity visible from dashboard
3. **Action Speed**: Status changes take < 3 clicks
4. **Zero Dead Ends**: All navigation leads somewhere useful
5. **Data Currency**: Real-time data within 60 seconds
