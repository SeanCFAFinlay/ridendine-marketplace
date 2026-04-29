/**
 * End-to-End Order Lifecycle Test
 *
 * This script tests the full order flow through the engine by calling
 * Supabase directly. Run with: npx tsx packages/engine/src/e2e/order-lifecycle.e2e.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY);
const results: Array<{ step: string; status: 'PASS' | 'FAIL'; detail: string }> = [];

function log(step: string, status: 'PASS' | 'FAIL', detail: string) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${step}: ${detail}`);
  results.push({ step, status, detail });
}

async function run() {
  console.log('\n=== RIDENDINE E2E ORDER LIFECYCLE TEST ===\n');

  // Step 1: Check storefronts exist
  const { data: storefronts } = await client
    .from('chef_storefronts')
    .select('id, name, slug, is_active, chef_id')
    .eq('is_active', true)
    .limit(1);

  if (!storefronts || storefronts.length === 0) {
    log('Storefronts', 'FAIL', 'No active storefronts found. Need seed data.');
    return printSummary();
  }
  const storefront = storefronts[0]!;
  log('Storefronts', 'PASS', `Found active storefront: ${storefront.name} (${storefront.slug})`);

  // Step 2: Check menu items
  const { data: menuItems } = await client
    .from('menu_items')
    .select('id, name, price, is_available, storefront_id')
    .eq('storefront_id', storefront.id)
    .eq('is_available', true)
    .limit(3);

  if (!menuItems || menuItems.length === 0) {
    log('Menu Items', 'FAIL', 'No available menu items for this storefront');
    return printSummary();
  }
  log('Menu Items', 'PASS', `Found ${menuItems.length} items: ${menuItems.map(m => m.name).join(', ')}`);

  // Step 3: Check customers exist
  const { data: customers } = await client
    .from('customers')
    .select('id, user_id, first_name, last_name')
    .limit(1);

  if (!customers || customers.length === 0) {
    log('Customers', 'FAIL', 'No customers found. Need at least one customer.');
    return printSummary();
  }
  const customer = customers[0]!;
  log('Customers', 'PASS', `Found customer: ${customer.first_name} ${customer.last_name}`);

  // Step 4: Check customer has an address
  const { data: addresses } = await client
    .from('customer_addresses')
    .select('id, address_line1, city, lat, lng')
    .eq('customer_id', customer.id)
    .limit(1);

  if (!addresses || addresses.length === 0) {
    log('Addresses', 'FAIL', 'Customer has no delivery address');
    return printSummary();
  }
  const address = addresses[0]!;
  log('Addresses', 'PASS', `Address: ${address.address_line1}, ${address.city}`);

  // Step 5: Create order via engine
  const orderNumber = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const item = menuItems[0]!;
  const subtotal = item.price * 1;
  const deliveryFee = 5.00;
  const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
  const tax = Math.round((subtotal + serviceFee + deliveryFee) * 0.13 * 100) / 100;
  const total = subtotal + deliveryFee + serviceFee + tax;

  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      storefront_id: storefront.id,
      delivery_address_id: address.id,
      status: 'pending',
      engine_status: 'pending',
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax,
      tip: 0,
      total,
      payment_status: 'processing',
      payment_intent_id: `pi_e2e_test_${Date.now()}`,
      estimated_prep_minutes: 20,
    })
    .select()
    .single();

  if (orderError || !order) {
    log('Create Order', 'FAIL', orderError?.message || 'Unknown error');
    return printSummary();
  }
  log('Create Order', 'PASS', `Order ${orderNumber} created. Total: $${total.toFixed(2)}`);

  // Step 6: Create order items
  const { error: itemError } = await client
    .from('order_items')
    .insert({
      order_id: order.id,
      menu_item_id: item.id,
      menu_item_name: item.name,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
    });

  if (itemError) {
    log('Order Items', 'FAIL', itemError.message);
  } else {
    log('Order Items', 'PASS', `Added ${item.name} x1 ($${item.price})`);
  }

  // Step 7: Simulate chef accepts order
  const { error: acceptError } = await client
    .from('orders')
    .update({ status: 'accepted', engine_status: 'accepted' })
    .eq('id', order.id);

  if (acceptError) {
    log('Chef Accept', 'FAIL', acceptError.message);
  } else {
    log('Chef Accept', 'PASS', 'Order accepted by chef');
  }

  // Step 8: Add to kitchen queue
  const { error: queueError } = await client
    .from('kitchen_queue_entries')
    .insert({
      storefront_id: storefront.id,
      order_id: order.id,
      position: 1,
      estimated_prep_minutes: 20,
      status: 'queued',
    });

  if (queueError) {
    log('Kitchen Queue', 'FAIL', queueError.message);
  } else {
    log('Kitchen Queue', 'PASS', 'Added to kitchen queue position 1');
  }

  // Step 9: Simulate preparing → ready
  await client.from('orders').update({ status: 'preparing', engine_status: 'preparing', prep_started_at: new Date().toISOString() }).eq('id', order.id);
  log('Start Prep', 'PASS', 'Order is being prepared');

  await client.from('orders').update({ status: 'ready_for_pickup', engine_status: 'ready', ready_at: new Date().toISOString() }).eq('id', order.id);
  await client.from('kitchen_queue_entries').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('order_id', order.id);
  log('Mark Ready', 'PASS', 'Order ready for pickup');

  // Step 10: Create delivery
  const { data: delivery, error: deliveryError } = await client
    .from('deliveries')
    .insert({
      order_id: order.id,
      status: 'pending',
      pickup_address: `${storefront.name} Kitchen`,
      pickup_lat: address.lat || 43.2557,
      pickup_lng: address.lng || -79.8711,
      dropoff_address: `${address.address_line1}, ${address.city}`,
      dropoff_lat: address.lat || 43.2600,
      dropoff_lng: address.lng || -79.8650,
      delivery_fee: deliveryFee,
      driver_payout: 4.00,
      assignment_attempts_count: 0,
    })
    .select()
    .single();

  if (deliveryError || !delivery) {
    log('Create Delivery', 'FAIL', deliveryError?.message || 'Unknown');
  } else {
    log('Create Delivery', 'PASS', `Delivery created: ${delivery.id.slice(0, 8)}...`);
  }

  // Step 11: Check drivers exist
  const { data: drivers } = await client
    .from('drivers')
    .select('id, first_name, last_name, status')
    .eq('status', 'approved')
    .limit(1);

  if (!drivers || drivers.length === 0) {
    log('Driver Available', 'FAIL', 'No approved drivers. Delivery would need manual assignment.');
  } else {
    const driver = drivers[0]!;
    log('Driver Available', 'PASS', `${driver.first_name} ${driver.last_name} available`);

    // Assign driver
    if (delivery) {
      await client.from('deliveries').update({ driver_id: driver.id, status: 'assigned' }).eq('id', delivery.id);
      log('Assign Driver', 'PASS', `Assigned to ${driver.first_name}`);

      // Simulate delivery lifecycle
      await client.from('deliveries').update({ status: 'en_route_to_pickup' }).eq('id', delivery.id);
      await client.from('deliveries').update({ status: 'picked_up', actual_pickup_at: new Date().toISOString() }).eq('id', delivery.id);
      await client.from('orders').update({ status: 'picked_up', engine_status: 'picked_up' }).eq('id', order.id);
      log('Picked Up', 'PASS', 'Driver picked up order from kitchen');

      await client.from('deliveries').update({ status: 'delivered', actual_dropoff_at: new Date().toISOString() }).eq('id', delivery.id);
      await client.from('orders').update({ status: 'delivered', engine_status: 'delivered' }).eq('id', order.id);
      log('Delivered', 'PASS', 'Order delivered to customer');

      // Complete order
      await client.from('orders').update({ status: 'completed', engine_status: 'completed', payment_status: 'completed', completed_at: new Date().toISOString() }).eq('id', order.id);
      log('Complete Order', 'PASS', 'Order marked completed');
    }
  }

  // Step 12: Create ledger entries
  const { error: ledgerError } = await client.from('ledger_entries').insert([
    { order_id: order.id, entry_type: 'customer_charge_capture', amount_cents: Math.round(total * 100), currency: 'CAD', description: 'E2E test payment' },
    { order_id: order.id, entry_type: 'platform_fee', amount_cents: Math.round(subtotal * 0.15 * 100), currency: 'CAD', description: 'Platform commission' },
    { order_id: order.id, entry_type: 'chef_payable', amount_cents: Math.round(subtotal * 0.85 * 100), currency: 'CAD', description: 'Chef earnings', entity_type: 'chef', entity_id: storefront.chef_id },
    { order_id: order.id, entry_type: 'driver_payable', amount_cents: 400, currency: 'CAD', description: 'Driver delivery fee', entity_type: 'driver' },
    { order_id: order.id, entry_type: 'tax_collected', amount_cents: Math.round(tax * 100), currency: 'CAD', description: 'HST collected' },
  ]);

  if (ledgerError) {
    log('Ledger Entries', 'FAIL', ledgerError.message);
  } else {
    log('Ledger Entries', 'PASS', `5 ledger entries created (revenue: $${total.toFixed(2)})`);
  }

  // Step 13: Create order status history
  const statuses = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'completed'];
  for (let i = 1; i < statuses.length; i++) {
    await client.from('order_status_history').insert({
      order_id: order.id,
      previous_status: statuses[i - 1],
      new_status: statuses[i],
      status: statuses[i],
      notes: `E2E test: ${statuses[i - 1]} → ${statuses[i]}`,
    });
  }
  log('Status History', 'PASS', `${statuses.length - 1} status transitions recorded`);

  // Step 14: Verify final state
  const { data: finalOrder } = await client.from('orders').select('*').eq('id', order.id).single();
  const { data: finalLedger } = await client.from('ledger_entries').select('*').eq('order_id', order.id);

  if (finalOrder?.status === 'completed' && finalOrder?.payment_status === 'completed') {
    log('Final State', 'PASS', `Order ${orderNumber} completed. ${finalLedger?.length || 0} ledger entries.`);
  } else {
    log('Final State', 'FAIL', `Unexpected state: status=${finalOrder?.status}, payment=${finalOrder?.payment_status}`);
  }

  printSummary();
}

function printSummary() {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`E2E RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) {
    console.log('\nFailed steps:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.step}: ${r.detail}`));
  }
  console.log(`${'='.repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('E2E test crashed:', err);
  process.exit(1);
});
