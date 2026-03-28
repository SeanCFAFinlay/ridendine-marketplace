# ORDER FLOW WORKFLOW

## Customer Journey

```
Browse Chefs ──> Chef Menu ──> Cart ──> Checkout (Payment)
                     │              │
                     └── Add items ─┘
```

## Order Created (Status: PENDING)

When an order is created, it triggers notifications to:
- **OPS ADMIN** (ops.ridendine.ca) - Monitor
- **CHEF ADMIN** (chef.ridendine.ca) - Receives order
- **CUSTOMER** (ridendine.ca) - Confirmation

## Order Status Flow

```
PENDING
    │
    ▼
ACCEPTED (Chef accepts)
    │
    ▼
PREPARING (Chef cooking)
    │
    ▼
READY (Ready for pickup)
    │
    ├──> OPS ADMIN assigns driver
    │
    ▼
ASSIGNED (Driver assigned)
    │
    ▼
ACCEPTED (Driver accepts)
    │
    ▼
EN ROUTE TO PICKUP (GPS Tracking Active)
    │
    ▼
PICKED UP (Photo Proof)
    │
    ▼
EN ROUTE TO CUSTOMER (Real-time Tracking)
    │
    ▼
DELIVERED (Photo + Signature)
    │
    ▼
COMPLETED
```

## Post-Delivery Actions

- **Customer** → Can leave review
- **Chef** → Receives payment
- **Driver** → Receives earnings
- **Ops** → Updates analytics

## Status Descriptions

| Status | Description |
|--------|-------------|
| `pending` | Order placed, waiting for chef acceptance |
| `accepted` | Chef has accepted the order |
| `preparing` | Chef is cooking the order |
| `ready` | Order ready for pickup |
| `assigned` | Driver has been assigned |
| `en_route_to_pickup` | Driver heading to chef location |
| `picked_up` | Driver has collected the order |
| `en_route_to_dropoff` | Driver heading to customer |
| `delivered` | Order delivered to customer |
| `completed` | Order fully completed |
| `cancelled` | Order was cancelled |
| `failed` | Order failed (payment or other issue) |

## App Responsibilities

### Customer Web (ridendine.ca)
- Browse chefs and menus
- Add items to cart
- Checkout with payment
- Track order status
- Leave reviews

### Chef Admin (chef.ridendine.ca)
- Receive order notifications
- Accept/reject orders
- Update order status (preparing → ready)
- Manage menu items
- View earnings and analytics

### Ops Admin (ops.ridendine.ca)
- Monitor all orders in real-time
- Assign drivers to deliveries
- Manage chefs, drivers, customers
- Handle support tickets
- View platform analytics

### Driver App (driver.ridendine.ca)
- View available deliveries
- Accept delivery assignments
- Navigate to pickup/dropoff
- Update delivery status
- Capture proof photos
- Track earnings
