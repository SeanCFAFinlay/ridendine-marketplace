# 02 — The Codebase in Plain Language

No jargon. If you have never opened this code, start here.

---

## 1. What the program is

Ridendine is a food-delivery service, like Uber Eats or DoorDash, but built around **the cook rather than the restaurant**. Home cooks and small commercial kitchens ("ghost kitchens") in Hamilton, Ontario, set up a storefront, list dishes, and sell to customers nearby. Independent drivers pick the food up and deliver it.

The software is four separate websites that all read and write the same single database, plus a shared library of business rules that sits between the websites and the database and makes sure nobody breaks the rules.

Over time it also grew a second product inside the first: a set of tools that help a kitchen run itself — recipes, what ingredients cost, what's in the fridge, what to order from suppliers, what to cook tomorrow, who is working which shift, and whether the kitchen made money today.

And a third thing: an API that lets somebody *else's* website sell Ridendine food. The customer never sees Ridendine; Ridendine takes the payment and handles the delivery behind the scenes.

## 2. Who uses it

| Person | Where they go | What they do |
|---|---|---|
| **Customer** | `ridendine.ca` | Browse chefs, add food to a cart, pay, watch the order, review it. |
| **Chef / kitchen operator** | `chef.ridendine.ca` | Set up a storefront and menu, accept and cook orders, run the kitchen tools, request payment. |
| **Driver** | `driver.ridendine.ca` | Go online, receive delivery offers, accept, pick up, deliver, see earnings, cash out. |
| **Ridendine staff (ops, support, finance)** | `ops.ridendine.ca` | Watch the whole board, fix stuck orders, approve chefs and drivers, issue refunds, pay people, read reports. |
| **Partner business** | An API, no website | Sends orders in over the internet with a secret key. |
| **Stripe** (the payment company) | Calls back in | Tells Ridendine when a card actually charged. |

## 3. What starts it

Nothing runs continuously in the traditional sense. Each of the four websites is a Next.js application hosted on Vercel. A website "starts" when a browser asks for a page or an app asks for an API endpoint — Vercel spins up a small process, that process handles the request, and it goes away again.

Four things start work *without* a person clicking anything:

1. A **timer** at Vercel that is supposed to fire three background jobs (chase late orders, expire stale driver offers, push notifications to partners). **There is strong evidence this timer's calls do nothing** — see §11.
2. **Stripe calling back** when a customer's card succeeds or a refund lands.
3. A **partner** sending an order over the API.
4. During local development only, a small script (`pnpm local-cron`) that pretends to be the timer.

## 4. What happens during its main job

Take one order from start to finish.

1. A customer opens `ridendine.ca`, browses chefs, and adds dishes to a cart. The cart lives in the database, not the browser.
2. They go to checkout. The browser sends what *it* thinks the price is.
3. **The server recalculates the price from scratch and ignores the browser's number.** Food subtotal, delivery fee based on real driving distance, an 8% service fee, 13% Ontario HST, tip, minus any promo.
4. The server runs a quick risk check (is this amount sane, is this customer behaving normally) and asks the kitchen "are you open and are these dishes actually available right now?"
5. The server writes a **claim ticket** — a row that says "customer X is checking out cart Y right now". If the same request arrives twice (double-click, flaky network, retry), the second one finds the ticket and either returns the first answer or refuses. This is why you cannot accidentally buy the same dinner twice.
6. The order row is created. Stripe is asked to prepare a payment.
7. The browser shows the card form and the customer pays. **Ridendine's server never sees the card number** — it goes straight to Stripe.
8. Stripe calls Ridendine back: "payment succeeded, for order X, amount Z". The server checks the amount matches to the cent, refuses if not, and only then marks the order paid and puts it in the chef's queue.
9. The chef sees it, accepts it, cooks it, marks it ready.
10. At "ready", the dispatch system creates a delivery and looks for drivers: who is online, whose location was updated in the last 90 seconds, who is nearby, who has a good rating, who isn't already juggling deliveries, who hasn't been declining offers. It scores them and offers the job to the best one.
11. A driver accepts, drives to the kitchen, picks up, drives to the customer, marks delivered.
12. The order becomes complete. The money is split into ledger lines: what the chef earns, what the driver earns, what the platform keeps, what the tip is.
13. The customer can leave a review.

## 5. Where information enters

- Customers typing into the website (addresses, cart contents, tips, reviews).
- Chefs typing into their dashboard (menus, prices, recipes, stock counts, staff hours).
- Drivers' phones sending GPS positions while they're online.
- Stripe, telling the system what money actually moved.
- Partners, sending whole orders over the API.
- Ops staff, overriding things when something goes wrong.

## 6. Where information is stored

**One PostgreSQL database, hosted by Supabase.** 112 tables. That is the only place anything durable lives. There is no second database, no separate cache server (unless one optional add-on is switched on), no message queue.

Uploaded pictures (profile photos, dish photos, delivery proof) go into Supabase's file storage.

Two things are stored *outside*: Stripe holds the actual payment records, and email/SMS providers hold the messages that were sent.

## 7. What outside systems it depends on

- **Supabase** — the database, the login system, the file storage, and the live-update feed. If Supabase is down, everything is down.
- **Stripe** — payments in, payouts out. If Stripe is down, nobody can buy anything and nobody gets paid.
- **Vercel** — the hosting.
- **OpenStreetMap's free public servers** — one for turning an address into coordinates, one for calculating driving routes. These are **free community services with no account, no contract, and a fair-use policy**. They are used for real driver ranking and customer ETAs.
- **Optional:** Resend for email, Twilio for text messages, Upstash for shared rate-limiting. If these aren't configured the system quietly does something simpler instead.

## 8. What decisions it makes

| Decision | Rule |
|---|---|
| What the order costs | 8% service fee, 13% HST, delivery = $3.99 + $0.50/km capped at $9.99, +$2.00 if the food subtotal is under $15 |
| Whether prices surge | A multiplier from the service area, capped, applied only to the distance portion of the delivery fee |
| Whether a checkout is allowed | Risk rules on amount and behaviour; kitchen must be open and items available |
| Whether a state change is legal | A hard-coded map of allowed transitions. Anything else throws an error and is refused. |
| Which driver gets the offer | A score: closer is better, higher rating is better, more experience is better, being busy is worse, recently declining or letting offers expire is worse, plus a fairness bonus |
| Who at Ridendine can do what | A role-to-permission table checked on the server for every operations action |
| What each party earns | Platform keeps 15% of the food subtotal; driver gets 80% of the delivery fee; chef gets the rest |

## 9. What it is allowed to change

The software can create and update orders, deliveries, driver offers, ledger entries, payout records, kitchen data and notifications in its own database. It can create payment intents, refunds and transfers at Stripe. It can send emails and texts. It can write files to Supabase storage.

It **cannot** — by design — change a completed order's history, skip a state in the lifecycle, or write money twice for the same event.

## 10. How success is confirmed

- Checkout succeeded if the order exists and Stripe returned a payment intent.
- Payment succeeded if Stripe's callback arrived, the amount matched exactly, and the order moved to the chef's queue.
- Delivery succeeded if the driver marked it delivered and the delivery row is in the `delivered` state.
- Money is correct if the ledger entries balance against what Stripe says — which is what the reconciliation job is for.

## 11. What can go wrong

**Right now, the honest answer is: several things already have, quietly.**

- **The background timer probably does nothing.** The jobs are written to run when the timer *sends* work one way; the hosting platform sends it the other way. Nothing in the code proves this is broken and nothing proves it works — but the mismatch is visible in the source. If it is broken: orders where a chef never responds are never auto-cancelled, deliveries with no driver are never escalated, stale offers pile up, and partners never receive their notifications.
- **Nobody is watching for errors.** The error-monitoring service is installed as a dependency and configured in four files, but never actually switched on. If a server error happens at 3am, no alarm rings anywhere.
- **The money is never automatically checked against Stripe.** The job that compares Ridendine's ledger to Stripe's records is not scheduled. Someone must remember to run it by hand.
- **Batch payouts have no button.** The code to pay all chefs or all drivers for a period works and is properly locked down, but no screen calls it. Individual chefs and drivers *can* request their own money — that part works.
- **Referral links go to the wrong website.** They point at `ridendine.com/signup`, which is both the wrong domain ending and a page that does not exist.
- **Rate limiting may not be real.** Unless one optional service is switched on, each server instance counts requests separately, so an attacker spread across instances is barely limited.

## 12. How an operator detects and recovers from failure

Today:
- There is a health endpoint on every app that reports whether the database, Stripe and the background jobs look alive.
- The ops console has a live board, an exceptions queue, and a system-alerts feed.
- A smoke test runs against production every 6 hours and after every deployment, checking that public pages load and protected pages correctly refuse anonymous callers.

Missing:
- No alerting. Detection depends on somebody looking.
- No documented, tested restore from backup.
- Recovery from a half-finished operation (order created, payment failed) is handled automatically inside the checkout code, but recovery from a *stuck* order relies on an operator noticing and using an override.

## 13. What is proven, inferred, and unknown

**Proven** by reading the code and running its own gates: the structure, the routes, the state machine, the pricing rules, the permission matrix, the database schema, the fact that every API route is guarded, the referral-link defect, the fact that reconciliation and batch payouts have no automatic trigger, the fact that error monitoring is not wired up.

**Inferred** with high but not perfect confidence: that the background timer's calls do nothing (the code shape says so; only a production log can confirm).

**Unknown** without production access: whether the optional services are configured, whether backups exist and have ever been restored, what the real traffic and cost look like, and whether anything is currently sitting broken in the live database.
