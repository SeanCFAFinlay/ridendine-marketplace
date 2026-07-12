/**
 * Canonical seed UUIDs. Must match supabase/seeds/seed.sql.
 * Storefront 'every-bite-yum' = dddddddd-dddd-dddd-dddd-dddddddddddd
 * Menu item 'Classic Smash Burger' = 17e30000-0001-4000-8000-000000000001
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
    menuItemId: '17e30000-0001-4000-8000-000000000001',
  },
  seed: {
    /** Pending-approval chef profile UUID (for ops "approve chef" test) */
    pendingChefProfileId: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    /** Unassigned pending delivery UUID (for driver "accept offer" test) */
    pendingDeliveryId: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
  },
  /**
   * Ghost-kitchen (commissary) fixtures: the Every Bite Yum kitchen runs TWO
   * brands from one shared pool. Drives the multi-brand isolation + shared-pool
   * decrement e2e. See supabase/seeds/seed.sql "GHOST-KITCHEN" section.
   */
  ghostKitchen: {
    kitchenId: 'aa000000-0001-4000-8000-000000000001',
    brands: {
      everyBiteYum: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      saigonPhoHouse: 'd5000000-0002-4000-8000-000000000002',
    },
    /** A shared inventory item that must read identically from both brands. */
    sharedInventoryItemId: '1a170000-0003-4000-8000-000000000003',
  },
  stripe: {
    publishableKeyPrefix: 'pk_test_',
    paymentIntentPrefix: 'pi_',
    webhookEventPrefix: 'evt_',
  },
} as const;
