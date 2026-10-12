# RideNDine Open Questions & Assumptions Registry

> **Document 07 – Open Questions & Assumptions Registry** | Project: RideNDine Marketplace | Date: October 7, 2026 | Commit: `5599c2e5` | Author: AI-generated from codebase audit | Confidence Summary: 0 CONFIRMED / 0 INFERRED / 16 UNKNOWN

---

## 1. Overview & Purpose

This document serves as the master repository of **open business questions, external regulatory assumptions, and unconfirmed operational parameters** that cannot be definitively answered from codebase inspection alone. 

While the software architecture, transactional money flows, database schema, and UI interfaces are fully implemented and verified in the code, real-world marketplace operations require explicit executive, legal, and operational decisions before public traffic is routed to the platform.

Each item below is tagged with a unique identifier (`Q-001` through `Q-016`), its associated codebase context, the operational risk of leaving it unresolved, a recommended default action, and the designated stakeholder responsible for sign-off.

---

## 2. Summary Status Matrix

| ID | Domain | Open Question / Assumption | Priority | Assigned Stakeholder | Status |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **Q-001** | Legal / Health | Kitchen Health Inspection Certification (Ontario Reg 493/17) | **CRITICAL** | Legal Counsel / Ops Lead | `[UNKNOWN: Needs confirmation]` |
| **Q-002** | Legal / AGCO | AGCO Liquor Delivery License & Smart Serve Enforcement | **CRITICAL** | Legal Counsel / CEO | `[UNKNOWN: Needs confirmation]` |
| **Q-003** | Legal / Tax | Canadian Federal & Provincial HST Registration Number | **HIGH** | Chief Financial Officer | `[UNKNOWN: Needs confirmation]` |
| **Q-004** | Finance / Stripe | Chargeback & Fraud Dispute Liability Allocation Policy | **HIGH** | CFO / Head of Risk | `[UNKNOWN: Needs confirmation]` |
| **Q-005** | Finance / Stripe | Minimum Payout Balance & Automatic Transfer Thresholds | **MEDIUM** | CFO / Operations | `[UNKNOWN: Needs confirmation]` |
| **Q-006** | Finance / Tax | Courier T4A Independent Contractor Annual Tax Reporting | **HIGH** | Finance / Accounting | `[UNKNOWN: Needs confirmation]` |
| **Q-007** | Hardware / Kitchen | Physical Thermal Receipt Printer Standard (ESC/POS) | **MEDIUM** | Kitchen Operations Lead | `[UNKNOWN: Needs confirmation]` |
| **Q-008** | Hardware / Kitchen | KDS Tablet Hardware Specification & Mounting Standards | **LOW** | Kitchen Operations Lead | `[UNKNOWN: Needs confirmation]` |
| **Q-009** | Operations / Fleet | Courier Vehicle Inspection & Commercial Insurance Policy | **HIGH** | Ops Lead / Insurance Broker | `[UNKNOWN: Needs confirmation]` |
| **Q-010** | Operations / Fleet | Thermal Delivery Bag Issuance & Verification Protocol | **MEDIUM** | Operations Lead | `[UNKNOWN: Needs confirmation]` |
| **Q-011** | Customer Support | Customer Service Live Escalation & Operating Hours | **HIGH** | Head of Customer Experience | `[UNKNOWN: Needs confirmation]` |
| **Q-012** | Customer Support | Autonomous Refund Authorization Dollar Cap | **MEDIUM** | CFO / Customer Experience | `[UNKNOWN: Needs confirmation]` |
| **Q-013** | Telecom / Twilio | Twilio A2P 10DLC Registration & Dedicated Local Area Code | **HIGH** | Technical Operations | `[UNKNOWN: Needs confirmation]` |
| **Q-014** | Email / DNS | Production DMARC / SPF / DKIM DNS Enforcement for Resend | **HIGH** | Lead DevOps Engineer | `[UNKNOWN: Needs confirmation]` |
| **Q-015** | Marketing / Geo | Official Launch Geographic Bounding Box & Expansion Tiers | **HIGH** | CEO / Marketing Director | `[UNKNOWN: Needs confirmation]` |
| **Q-016** | Partner / COOCO | Partner Platform Service Level Agreement (SLA) & Pricing | **MEDIUM** | Head of Partnerships | `[UNKNOWN: Needs confirmation]` |

---

## 3. Exhaustive Domain Question Catalog

### Domain A: Legal, Compliance & Health Regulations

#### Q-001: Kitchen Health Inspection Certification (Ontario Reg 493/17)
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/chef-admin/src/app/dashboard/settings/page.tsx` captures kitchen address, operating hours, and basic profile data, but does not enforce an mandatory upload of a Municipal DineSafe / Public Health Inspection Certificate.
- **Operational Risk:** Operating an unlicensed commercial food establishment or facilitating uninspected home food sales violates Ontario Public Health regulations and exposes the platform to municipal cease-and-desist orders.
- **Recommended Default:** Require all pilot kitchens to upload a valid municipal DineSafe inspection report or certified Commercial Kitchen Lease Agreement during the onboarding checklist before the storefront can be marked `active`.
- **Stakeholder:** Legal Counsel & Kitchen Operations Lead

#### Q-002: AGCO Liquor Delivery License & Smart Serve Enforcement
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/web/src/app/checkout/page.tsx` checks for `contains_alcohol: true` and renders an age verification modal (19+). `apps/driver-app/src/app/orders/[id]/page.tsx` instructs couriers to verify physical photo ID at the door.
- **Operational Risk:** Under Alcohol and Gaming Commission of Ontario (AGCO) regulations, delivering liquor requires a Liquor Delivery Service Licence, and all delivery drivers must hold active Smart Serve certification.
- **Recommended Default:** Block alcohol-tagged items from public customer menus until RideNDine's AGCO Delivery Licence number is issued and recorded in `platform_settings`. Require couriers to enter their Smart Serve certification number in `apps/driver-app/src/app/profile/documents`.
- **Stakeholder:** Legal Counsel & CEO

#### Q-003: Canadian Federal & Provincial HST Registration Number
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `packages/engine/src/checkout.ts` calculates a 13.00% HST rate on platform service fees and delivery fees `[CONFIRMED]`. `apps/web/src/app/orders/[id]/receipt/page.tsx` renders tax line items but displays a placeholder or empty string for the corporate HST Registration Number.
- **Operational Risk:** Canadian tax regulations require businesses collecting HST exceeding $30,000 in gross revenue to display their registered 9-digit Business Number (`BN / RT0001`) on all customer tax invoices and receipts.
- **Recommended Default:** Add `tax_registration_number` column to `platform_settings` and render the official CRA registration number on all generated PDF receipts and email confirmations.
- **Stakeholder:** Chief Financial Officer (CFO)

---

### Domain B: Financial, Banking & Stripe Connect Policies

#### Q-004: Chargeback & Fraud Dispute Liability Allocation Policy
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** Stripe Connect charges use Direct Charges with Destination (`transfer_data.destination = chef_stripe_account_id`) or Separate Charges and Transfers `[CONFIRMED: apps/web/src/app/api/checkout/route.ts]`.
- **Operational Risk:** When a customer disputes a credit card charge (claiming non-delivery or fraud), Stripe assesses a $15.00 dispute administrative fee and claws back the full transaction amount. The codebase does not specify whether this clawback is debited from the chef's Connected Account balance or absorbed by RideNDine's platform treasury.
- **Recommended Default:** If the dispute is culinary (e.g., incorrect food, missing item, food quality), the chef absorbs the food cost. If the dispute is delivery-related (e.g., driver stolen food or GPS verified arrival), the platform absorbs the loss or deducts from the courier payout ledger.
- **Stakeholder:** CFO & Head of Risk

#### Q-005: Minimum Payout Balance & Automatic Transfer Thresholds
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/chef-admin/src/app/dashboard/payouts/page.tsx` and `apps/driver-app/src/app/earnings/page.tsx` display weekly payouts.
- **Operational Risk:** Initiating bank transfers (EFT / ACH) via Stripe Connect for micro-amounts (e.g., $4.50) incurs fixed per-transfer processing costs (e.g., $0.25 to $2.00) that erode platform margins.
- **Recommended Default:** Establish a minimum payout balance threshold of $25.00 CAD for automated weekly disbursements. Balances below $25.00 roll over into the following payout cycle.
- **Stakeholder:** CFO & Operations

#### Q-006: Courier T4A Independent Contractor Annual Tax Reporting
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `driver_payouts` logs cumulative gross courier earnings `[CONFIRMED: packages/db schema]`, but there is no automated batch export for Canadian CRA T4A Box 048 (Fees for Services) or T5018 forms.
- **Operational Risk:** Canadian tax law requires platform operators to report independent contractor earnings over $500 annually to the Canada Revenue Agency.
- **Recommended Default:** Add a year-end accounting CSV export in `apps/ops-admin/src/app/dashboard/finance/tax-reports` aggregating annual earnings per courier SIN/BN.
- **Stakeholder:** Finance & Corporate Accounting

---

### Domain C: Kitchen Hardware & Commissary Operations

#### Q-007: Physical Thermal Receipt Printer Standard (ESC/POS)
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` features an interactive digital KDS board with acoustic web audio notifications `[CONFIRMED]`. Physical receipt printing currently invokes standard browser `window.print()`.
- **Operational Risk:** Commercial kitchen environments are noisy, humid, and greasy. Relying solely on browser screens or consumer desktop printers leads to missed tickets and paper jams.
- **Recommended Default:** Standardize on Epson TM-T88VI or Star Micronics TSP143III receipt printers utilizing network LAN or Bluetooth connectivity. Provide a lightweight local ESC/POS print gateway or direct WebUSB integration in `apps/chef-admin`.
- **Stakeholder:** Kitchen Operations Lead

#### Q-008: KDS Tablet Hardware Specification & Mounting Standards
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** The KDS interface adapts responsively down to 768px tablet viewports `[CONFIRMED: apps/chef-admin/src/components/kitchen/KDSBoard.tsx]`.
- **Operational Risk:** Fragile consumer tablets mounted near commercial fryers or steam tables experience thermal shutdowns and screen cracking.
- **Recommended Default:** Recommend ruggedized 10.1" Android or iPad (9th/10th Gen) tablets housed in IP54-rated water-resistant commercial silicone cases with heavy-duty VESA magnetic or clamp mounts.
- **Stakeholder:** Kitchen Operations Lead

---

### Domain D: Delivery Fleet & Field Operations

#### Q-009: Courier Vehicle Inspection & Commercial Insurance Policy
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/driver-app/src/app/profile/documents/page.tsx` permits drivers to upload Driver's License and Vehicle Insurance documents `[CONFIRMED]`. However, personal auto insurance policies in Ontario generally exclude commercial food delivery activities unless an endorsement is purchased.
- **Operational Risk:** If an active courier causes a collision while on a delivery dispatch without commercial coverage, the personal insurer may deny the claim, creating vicarious liability exposure for RideNDine.
- **Recommended Default:** Secure a corporate Contingent Commercial Automobile Insurance Policy covering couriers during the delivery window (from offer acceptance to order drop-off).
- **Stakeholder:** Operations Lead & Corporate Insurance Broker

#### Q-010: Thermal Delivery Bag Issuance & Verification Protocol
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** Courier onboarding requires basic profile submission, but does not enforce physical proof of equipment possession.
- **Operational Risk:** Delivering hot prepared food without commercial-grade insulated thermal delivery bags leads to food arriving cold, high customer refund rates, and food safety temperature violations.
- **Recommended Default:** Require couriers to upload a photograph of an insulated thermal hot bag during registration before granting `active` dispatch status.
- **Stakeholder:** Operations Lead

---

### Domain E: Customer Support, Escalation & Service Levels

#### Q-011: Customer Service Live Escalation & Operating Hours
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/web/src/app/support/page.tsx` provides an email contact form submitting to `support_tickets` in the database `[CONFIRMED]`.
- **Operational Risk:** In food delivery, diners and drivers require immediate response times (< 2 minutes) for missing orders, gate codes, or delivery delays. Email ticket turnaround times of several hours are fatal to customer retention.
- **Recommended Default:** Implement an emergency operations telephone routing line (via Twilio Voice) forwarding directly to on-duty operations personnel during active kitchen operating hours (e.g. 11:00 AM – 11:00 PM EST).
- **Stakeholder:** Head of Customer Experience

#### Q-012: Autonomous Refund Authorization Dollar Cap
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` includes an administrative "Issue Refund" button that invokes `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` `[CONFIRMED]`.
- **Operational Risk:** Inexperienced support agents could issue large or fraudulent refunds without executive oversight.
- **Recommended Default:** Establish code-enforced refund authorization tiers:
  - Up to $30.00: Automated tier-1 support agent approval.
  - $30.01 to $100.00: Requires Ops Manager approval.
  - Over $100.00: Requires Super-Admin password re-authentication.
- **Stakeholder:** CFO & Head of Customer Experience

---

### Domain F: Telecommunications, Messaging & Marketing

#### Q-013: Twilio A2P 10DLC Registration & Dedicated Local Area Code
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `packages/notifications/src/sms.ts` utilizes Twilio SDK with `TWILIO_FROM_NUMBER` `[CONFIRMED]`.
- **Operational Risk:** North American telecommunication carriers block unregistered Application-to-Person (A2P) 10DLC SMS traffic as spam. Failure to register RideNDine's EIN/BN with the Campaign Registry will result in 100% of dispatch and OTP SMS messages being filtered and dropped.
- **Recommended Default:** Complete the Twilio A2P 10DLC Brand and Campaign registration immediately under the "Customer Care / Delivery Alerts" category using a local Ontario area code (e.g., 905, 289, or 365).
- **Stakeholder:** Technical Operations & Lead Developer

#### Q-014: Production DMARC / SPF / DKIM DNS Enforcement for Resend
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `packages/notifications/src/email.ts` sends order receipts from `orders@ridendine.ca` using Resend `[CONFIRMED]`.
- **Operational Risk:** Major email providers (Gmail, Yahoo, Outlook) reject transactional emails without strict SPF, DKIM, and DMARC alignment records configured on the `ridendine.ca` root domain.
- **Recommended Default:** Verify and publish the Resend DNS validation CNAME and TXT records on the domain registrar DNS management console.
- **Stakeholder:** Lead DevOps Engineer

#### Q-015: Official Launch Geographic Bounding Box & Expansion Tiers
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** Default search and dispatch radius is hardcoded to 15.0 km centered on kitchen coordinates `[CONFIRMED: platform_settings]`.
- **Operational Risk:** A 15 km radius in certain geographic areas (e.g. crossing waterways or international borders near Niagara) could create delivery requests that are physically unreachable or economically unfeasible.
- **Recommended Default:** Define explicit polygon geofences in PostGIS bounding the active launch corridor (e.g., Niagara Falls / St. Catharines / Hamilton urban core) and restrict order placement to addresses strictly within the verified polygon.
- **Stakeholder:** CEO & Marketing Director

#### Q-016: Partner Platform Service Level Agreement (SLA) & Pricing
- **Status:** Not found in code – needs confirmation `[UNKNOWN]`
- **Code Context:** `/api/partner/*` routes allow external partner platforms (COOCO) to submit orders with custom billing parameters `[CONFIRMED: apps/web/src/app/api/partner/orders/route.ts]`.
- **Operational Risk:** Unclear contractual terms regarding delivery failure compensation, food spoilage liability, and data privacy between RideNDine and partner merchants.
- **Recommended Default:** Execute a formal bilateral B2B Master Services Agreement (MSA) detailing 30-minute delivery SLAs, data sharing protocols, and billing settlement terms prior to enabling partner production API keys.
- **Stakeholder:** Head of Strategic Partnerships
