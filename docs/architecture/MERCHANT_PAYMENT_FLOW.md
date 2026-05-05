# Merchant Payment Flow (Ridendine)

This document describes the end-to-end payment flow for merchants (chefs) on the Ridendine platform.

## Overview

The payment flow covers the process from when a customer places an order to when the chef receives their payout.

## Payment Flow Steps

1. **Customer places order**
2. **Payment is authorized (via payment gateway)**
3. **Order is created with status: 'pending'**
4. **Chef accepts the order**
5. **Order is prepared and delivered**
6. **Order is marked as delivered**
7. **Funds are settled to the platform's account**
8. **Platform calculates chef payout (minus fees/commission)**
9. **Chef payout is scheduled (per payout schedule)**
10. **Chef receives payment (bank transfer or preferred method)**

## Payment Flow Diagram

```mermaid
flowchart TD
  O1[Customer Places Order] --> O2[Payment Authorized]
  O2 --> O3[Order Created: Pending]
  O3 --> O4[Chef Accepts Order]
  O4 --> O5[Order Prepared & Delivered]
  O5 --> O6[Order Marked Delivered]
  O6 --> O7[Funds Settled to Platform]
  O7 --> O8[Platform Calculates Chef Payout]
  O8 --> O9[Chef Payout Scheduled]
  O9 --> O10[Chef Receives Payment]
```

## Notes
- Payment authorization occurs before the order is sent to the chef.
- Platform fees and commissions are deducted before chef payout.
- Payouts may be batched (e.g., daily/weekly) depending on platform policy.
- Refunds or disputes may interrupt the flow and delay payout.
