/**
 * @jest-environment node
 *
 * Orders schema contract test.
 *
 * The web checkout route (apps/web/src/app/api/checkout/route.ts) writes
 * specific columns and status values to the `orders` table. If a migration
 * is ever reverted or a column is renamed without updating the route, every
 * customer hitting that code path eats a 500.
 *
 * This file pins the contract: the route depends on these columns/values
 * existing in the canonical schema. The test reads the migration SQL
 * directly, so it's fast and needs no Postgres.
 *
 * Regression for the 2026-05 production payment failure: customers using the
 * DeliveryTimePicker hit a 500 because the route wrote `scheduled_for` and
 * `status = 'scheduled'`, neither of which existed in any migration until
 * 00039_scheduled_orders.sql shipped.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const MIGRATIONS_DIR = join(__dirname, '../../../../supabase/migrations');

function allMigrationSql(): string {
  const files = glob.sync('*.sql', { cwd: MIGRATIONS_DIR }).sort();
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n\n');
}

describe('orders schema contract — columns and enums the web route depends on', () => {
  const sql = allMigrationSql();

  describe('orders.status enum', () => {
    it.each([
      'pending',
      'accepted',
      'preparing',
      'ready_for_pickup',
      'picked_up',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
    ])('contains canonical status %s', (value) => {
      expect(sql).toMatch(new RegExp(`'${value}'`));
    });

    it("contains 'scheduled' status (added in 00039 — required by scheduled-checkout flow)", () => {
      expect(sql).toMatch(/'scheduled'/);
    });
  });

  describe('orders.scheduled_for column', () => {
    it('is declared somewhere across migrations', () => {
      // Either as ADD COLUMN ... scheduled_for, or as part of the CREATE TABLE.
      expect(sql).toMatch(/\bscheduled_for\b/i);
    });

    it('is added by an ALTER TABLE in a follow-on migration (post-00001)', () => {
      // The initial schema doesn't declare it — it lives in 00039.
      const init = readFileSync(
        join(MIGRATIONS_DIR, '00001_initial_schema.sql'),
        'utf8'
      );
      expect(init).not.toMatch(/scheduled_for/i);

      // And some later migration must add it.
      const laterMigrations = glob
        .sync('*.sql', { cwd: MIGRATIONS_DIR })
        .filter((f) => !f.startsWith('00001_'))
        .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
        .join('\n');

      expect(laterMigrations).toMatch(
        /ALTER\s+TABLE\s+orders[\s\S]*scheduled_for/i
      );
    });
  });

  describe('orders.payment_intent_id column', () => {
    it('exists for Stripe correlation', () => {
      expect(sql).toMatch(/payment_intent_id/i);
    });
  });

  describe('orders.payment_status enum', () => {
    it.each(['pending', 'processing', 'completed', 'failed', 'refunded'])(
      'contains payment_status %s',
      (value) => {
        expect(sql).toMatch(new RegExp(`'${value}'`));
      }
    );
  });
});
