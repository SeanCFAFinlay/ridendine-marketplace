/**
 * Canonical seed UUIDs. Must match supabase/seeds/seed.sql.
 * Storefront 'every-bite-yum' = dddddddd-dddd-dddd-dddd-dddddddddddd
 * Menu item 'Classic Smash Burger' = item-eby-01 (string ID, not UUID)
 * Pending-approval chef profile = a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1
 * Unassigned pending delivery = b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2
 */
export const deterministicFixtures = {
  customer: {
    email: 'e2e.customer@ridendine.test',
    id: '00000000-0000-0000-0000-000000000101',
  },
  chef: {
    email: 'e2e.chef@ridendine.test',
    storefrontSlug: 'every-bite-yum',
    id: '00000000-0000-0000-0000-000000000201',
  },
  driver: {
    email: 'e2e.driver@ridendine.test',
    id: '00000000-0000-0000-0000-000000000301',
  },
  cart: {
    /** Canonical storefront UUID from seed.sql: Every Bite Yum */
    storefrontId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    /** Seed menu item ID for Classic Smash Burger */
    menuItemId: 'item-eby-01',
  },
  seed: {
    /** Pending-approval chef profile UUID (for ops "approve chef" test) */
    pendingChefProfileId: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    /** Unassigned pending delivery UUID (for driver "accept offer" test) */
    pendingDeliveryId: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
  },
  stripe: {
    publishableKeyPrefix: 'pk_test_',
    paymentIntentPrefix: 'pi_',
    webhookEventPrefix: 'evt_',
  },
} as const;
