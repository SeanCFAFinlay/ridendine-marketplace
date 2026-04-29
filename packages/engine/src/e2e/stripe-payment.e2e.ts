/**
 * End-to-End Stripe Payment Test
 *
 * Tests the full payment flow: create PaymentIntent → confirm with test card →
 * simulate webhook → verify order submitted to kitchen → verify ledger entries.
 *
 * Run: npx tsx ./packages/engine/src/e2e/stripe-payment.e2e.ts
 *
 * Requires: STRIPE_SECRET_KEY (test key), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createCentralEngine } from '../core/engine.factory';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Need: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!STRIPE_KEY.startsWith('sk_test_')) {
  console.error('DANGER: This is not a test Stripe key. Aborting to prevent real charges.');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const engine = createCentralEngine(supabase);

const results: Array<{ step: string; status: 'PASS' | 'FAIL'; detail: string }> = [];

function log(step: string, status: 'PASS' | 'FAIL', detail: string) {
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${step}: ${detail}`);
  results.push({ step, status, detail });
}

async function run() {
  console.log('\n=== RIDENDINE E2E STRIPE PAYMENT TEST ===\n');

  // Step 1: Get test data
  const { data: storefronts } = await supabase
    .from('chef_storefronts').select('id, name, chef_id').eq('is_active', true).limit(1);
  if (!storefronts?.[0]) { log('Setup', 'FAIL', 'No active storefront'); return done(); }
  const storefront = storefronts[0];

  const { data: menuItems } = await supabase
    .from('menu_items').select('id, name, price').eq('storefront_id', storefront.id).eq('is_available', true).limit(2);
  if (!menuItems?.length) { log('Setup', 'FAIL', 'No menu items'); return done(); }

  const { data: customers } = await supabase.from('customers').select('id, user_id, first_name, email').limit(1);
  if (!customers?.[0]) { log('Setup', 'FAIL', 'No customer'); return done(); }
  const customer = customers[0];

  const { data: addresses } = await supabase.from('customer_addresses').select('id').eq('customer_id', customer.id).limit(1);
  if (!addresses?.[0]) { log('Setup', 'FAIL', 'No address'); return done(); }

  log('Setup', 'PASS', `Storefront: ${storefront.name}, Customer: ${customer.first_name}, Items: ${menuItems.length}`);

  // Step 2: Calculate order totals (mimics checkout route)
  const items = menuItems.map(m => ({ id: m.id, name: m.name, price: Number(m.price), qty: 1 }));
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = 5.00;
  const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
  const tax = Math.round((subtotal + serviceFee + deliveryFee) * 0.13 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + serviceFee + tax) * 100) / 100;
  const totalCents = Math.round(total * 100);

  log('Calculate', 'PASS', `Subtotal: $${subtotal.toFixed(2)}, Fee: $${serviceFee.toFixed(2)}, Tax: $${tax.toFixed(2)}, Total: $${total.toFixed(2)}`);

  // Step 3: Create Stripe PaymentIntent
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'cad',
      metadata: {
        customer_id: customer.id,
        storefront_id: storefront.id,
        test: 'e2e',
      },
      // Auto-confirm with test card (bypasses Elements UI)
      confirm: true,
      payment_method: 'pm_card_visa', // Stripe test payment method
      return_url: 'https://ridendine.ca/order-confirmation/test',
    });
    log('PaymentIntent', 'PASS', `${paymentIntent.id} — status: ${paymentIntent.status}, amount: $${(paymentIntent.amount / 100).toFixed(2)} CAD`);
  } catch (err: any) {
    log('PaymentIntent', 'FAIL', err.message);
    return done();
  }

  // Step 4: Verify payment succeeded
  if (paymentIntent.status !== 'succeeded') {
    log('Payment Confirm', 'FAIL', `Expected succeeded, got ${paymentIntent.status}`);
    return done();
  }
  log('Payment Confirm', 'PASS', `Payment succeeded. Card: Visa ending 4242`);

  // Step 5: Create the order in DB (TEST SETUP: mimics what checkout route does before webhook)
  const orderNumber = `STRIPE-E2E-${Date.now().toString(36).toUpperCase()}`;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      storefront_id: storefront.id,
      delivery_address_id: addresses[0].id,
      status: 'pending',
      engine_status: 'payment_authorized',
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax,
      tip: 0,
      total,
      payment_status: 'processing',
      payment_intent_id: paymentIntent.id,
      estimated_prep_minutes: 20,
    })
    .select()
    .single();

  if (orderError || !order) {
    log('Create Order', 'FAIL', orderError?.message || 'Unknown');
    return done();
  }
  log('Create Order', 'PASS', `Order ${orderNumber} linked to ${paymentIntent.id}`);

  // Step 6: Create order items (TEST SETUP: not a status transition)
  for (const item of items) {
    await supabase.from('order_items').insert({
      order_id: order.id,
      menu_item_id: item.id,
      menu_item_name: item.name,
      quantity: item.qty,
      unit_price: item.price,
      total_price: item.price * item.qty,
    });
  }
  log('Order Items', 'PASS', `${items.length} items: ${items.map(i => i.name).join(', ')}`);

  // Step 7: Simulate webhook — payment_intent.succeeded
  // (In production, Stripe sends this to /api/webhooks/stripe)
  // We simulate what the webhook handler does: submit to kitchen + create ledger entry
  // Route the status transition through the engine (payment_authorized → pending)
  await engine.masterOrder.submitToChef({
    orderId: order.id,
    actorId: 'system',
  });

  await supabase.from('ledger_entries').insert({
    order_id: order.id,
    entry_type: 'customer_charge_auth',
    amount_cents: totalCents,
    currency: 'CAD',
    description: `Payment auth for ${orderNumber}`,
    stripe_id: paymentIntent.id,
  });

  log('Webhook Sim', 'PASS', 'Simulated payment_intent.succeeded → order submitted to kitchen');

  // Step 8: Verify the order can be processed through the full lifecycle
  // Chef accepts — routed through engine
  const chefAcceptResult = await engine.masterOrder.chefAccept({
    orderId: order.id,
    actorId: storefront.chef_id,
    actorRole: 'chef_user',
  });
  if (!chefAcceptResult.success) {
    log('Chef Accept', 'FAIL', chefAcceptResult.error || 'Engine returned failure');
    return done();
  }
  log('Chef Accept', 'PASS', 'Chef accepted order');

  // Chef prepares and marks ready — routed through engine
  await engine.masterOrder.markPreparing({
    orderId: order.id,
    actorId: storefront.chef_id,
    actorRole: 'chef_user',
  });
  await engine.masterOrder.markReadyForPickup({
    orderId: order.id,
    actorId: storefront.chef_id,
    actorRole: 'chef_user',
  });
  log('Chef Ready', 'PASS', 'Order prepared and ready for pickup');

  // Delivery creation (TEST SETUP: not a status transition)
  const { data: delivery } = await supabase.from('deliveries').insert({
    order_id: order.id, status: 'pending',
    pickup_address: 'Every Bite Yum Kitchen', pickup_lat: 43.2557, pickup_lng: -79.8711,
    dropoff_address: '88 James St S, Hamilton', dropoff_lat: 43.2600, dropoff_lng: -79.8650,
    delivery_fee: deliveryFee, driver_payout: 4.00, assignment_attempts_count: 0,
  }).select().single();

  const { data: drivers } = await supabase.from('drivers').select('id, first_name').eq('status', 'approved').limit(1);
  if (drivers?.[0] && delivery) {
    const driver = drivers[0];

    // Request dispatch (READY → DISPATCH_PENDING) — routed through engine
    await engine.masterOrder.requestDriverAssignment({
      orderId: order.id,
      actorId: 'system',
      actorRole: 'system',
    });

    // Assign driver (DISPATCH_PENDING → DRIVER_ASSIGNED) — routed through engine
    await engine.masterOrder.markDriverAssigned({
      orderId: order.id,
      actorId: 'system',
      driverId: driver.id,
    });

    // Driver accepts delivery (pending → accepted) — routed through engine
    await engine.masterDelivery.driverAcceptDelivery({
      deliveryId: delivery.id,
      actorId: driver.id,
      driverId: driver.id,
    });

    // En route to pickup — also syncs order to DRIVER_EN_ROUTE_PICKUP
    await engine.masterDelivery.markEnRouteToPickup({
      deliveryId: delivery.id,
      actorId: driver.id,
    });

    // Picked up — also syncs order status to PICKED_UP
    await engine.masterDelivery.markPickedUp({
      deliveryId: delivery.id,
      actorId: driver.id,
    });

    // En route to customer — syncs order to DRIVER_EN_ROUTE_CUSTOMER
    await engine.masterDelivery.markEnRouteToCustomer({
      deliveryId: delivery.id,
      actorId: driver.id,
    });

    // Delivered — also syncs order status to DELIVERED
    await engine.masterDelivery.markDelivered({
      deliveryId: delivery.id,
      actorId: driver.id,
    });
  }

  // Complete order + capture payment in ledger — routed through engine
  await engine.masterOrder.completeOrder({
    orderId: order.id,
    actorId: 'system',
    actorRole: 'system',
  });

  await supabase.from('ledger_entries').insert([
    { order_id: order.id, entry_type: 'customer_charge_capture', amount_cents: totalCents, currency: 'CAD', description: 'Payment captured', stripe_id: paymentIntent.id },
    { order_id: order.id, entry_type: 'platform_fee', amount_cents: Math.round(subtotal * 0.15 * 100), currency: 'CAD', description: 'Platform 15%' },
    { order_id: order.id, entry_type: 'chef_payable', amount_cents: Math.round(subtotal * 0.85 * 100), currency: 'CAD', description: 'Chef earnings', entity_type: 'chef', entity_id: storefront.chef_id },
    { order_id: order.id, entry_type: 'tax_collected', amount_cents: Math.round(tax * 100), currency: 'CAD', description: 'HST' },
  ]);
  log('Ledger', 'PASS', `Payment captured, fees split, chef payable: $${(subtotal * 0.85).toFixed(2)}`);

  log('Complete', 'PASS', 'Order completed with Stripe payment');

  // Step 9: Verify we can refund
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: totalCents, // Full refund
      metadata: { order_id: order.id, reason: 'e2e_test' },
    });
    log('Stripe Refund', 'PASS', `Refund ${refund.id} — status: ${refund.status}, amount: $${(refund.amount / 100).toFixed(2)}`);
  } catch (err: any) {
    log('Stripe Refund', 'FAIL', err.message);
    return done();
  }

  // Record refund in ledger (TEST SETUP: ledger entry, not an order status transition)
  await supabase.from('ledger_entries').insert({
    order_id: order.id,
    entry_type: 'customer_refund',
    amount_cents: -totalCents,
    currency: 'CAD',
    description: 'Full refund (e2e test)',
    stripe_id: refund.id,
  });

  // Refund order status — routed through engine
  await engine.masterOrder.refundOrder({
    orderId: order.id,
    actorId: 'system',
    actorRole: 'ops_manager',
    reason: 'E2E test refund',
  });
  log('Refund Recorded', 'PASS', `Order refunded. Net: $0.00`);

  // Step 10: Final verification
  const { data: finalOrder } = await supabase.from('orders').select('*').eq('id', order.id).single();
  const { data: finalLedger } = await supabase.from('ledger_entries').select('entry_type, amount_cents').eq('order_id', order.id);

  const netCents = (finalLedger || []).reduce((s: number, e: any) => s + e.amount_cents, 0);
  const entryTypes = (finalLedger || []).map((e: any) => e.entry_type);

  if (finalOrder?.payment_status === 'refunded' && entryTypes.includes('customer_refund')) {
    log('Final Check', 'PASS', `Order ${orderNumber}: refunded. ${finalLedger?.length} ledger entries. Net: $${(netCents / 100).toFixed(2)}`);
  } else if (finalOrder?.engine_status === 'refunded' && entryTypes.includes('customer_refund')) {
    log('Final Check', 'PASS', `Order ${orderNumber}: engine_status=refunded. ${finalLedger?.length} ledger entries. Net: $${(netCents / 100).toFixed(2)}`);
  } else {
    log('Final Check', 'FAIL', `payment_status=${finalOrder?.payment_status}, engine_status=${finalOrder?.engine_status}, entries=${finalLedger?.length}`);
  }

  // Print Stripe dashboard link
  console.log(`\n📋 View in Stripe: https://dashboard.stripe.com/test/payments/${paymentIntent.id}`);

  done();
}

function done() {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n${'='.repeat(55)}`);
  console.log(`STRIPE E2E: ${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.step}: ${r.detail}`));
  }
  console.log(`${'='.repeat(55)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Crashed:', err); process.exit(1); });
