/**
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readRoute(relativePath: string): string {
  return readFileSync(join(__dirname, '../../src/app/api', relativePath, 'route.ts'), 'utf8');
}

describe('web API ownership guard coverage', () => {
  it('orders detail route scopes by authenticated customer id', () => {
    const src = readRoute('orders/[id]');
    expect(src).toContain(".eq('customer_id', customerContext.customerId)");
  });

  it('support ticket detail route scopes by authenticated customer id', () => {
    const src = readRoute('support/tickets/[id]');
    expect(src).toContain('getSupportTicketForCustomer');
    expect(src).toContain('customer.id');
  });

  it('cart mutation route verifies cart item ownership before patch/delete', () => {
    const src = readRoute('cart');
    expect(src).toContain(".eq('carts.customer_id', customer.id)");
    expect(src).toContain('Cart item not found');
  });

  it('address mutation route verifies address ownership before patch/delete', () => {
    const src = readRoute('addresses');
    expect(src).toContain(".eq('customer_id', customer.id)");
    expect(src).toContain('Address not found');
  });
});
