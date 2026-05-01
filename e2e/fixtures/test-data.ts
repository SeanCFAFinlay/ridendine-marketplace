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
    storefrontId: '11111111-1111-1111-1111-111111111111',
    menuItemId: '22222222-2222-2222-2222-222222222222',
  },
  stripe: {
    publishableKeyPrefix: 'pk_test_',
    paymentIntentPrefix: 'pi_',
    webhookEventPrefix: 'evt_',
  },
} as const;
