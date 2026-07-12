// ==========================================
// KITCHEN (GHOST-KITCHEN OPERATOR) ROLES & CAPABILITIES
//
// Chef-app-scoped roles for a commissary kitchen that runs many brand
// storefronts. This is deliberately SEPARATE from PLATFORM_CAPABILITIES
// (ops-admin): it does not expand the platform guard matrix. Kitchen roles
// gate what a member of a chef_kitchen can do inside chef-admin.
// ==========================================

export const KITCHEN_ROLES = ['operator', 'head_chef', 'line_staff'] as const;
export type KitchenRole = (typeof KITCHEN_ROLES)[number];

// The distinct capability surfaces a kitchen member can hold. Kept as a flat
// vocabulary so UI and route guards can check membership cheaply.
export const KITCHEN_CAPABILITIES = [
  'inventory',
  'suppliers',
  'production',
  'labor',
  'payroll',
  'recipes',
  'menu',
  'kds',
  'pnl',
  'settings',
  'clock',
] as const;
export type KitchenCapability = (typeof KITCHEN_CAPABILITIES)[number];

// Role -> capabilities. operator = full commissary control; head_chef = the
// day-to-day kitchen surfaces minus money/settings; line_staff = KDS + clock.
export const KITCHEN_CAPS = {
  operator: [
    'inventory',
    'suppliers',
    'production',
    'labor',
    'payroll',
    'recipes',
    'menu',
    'kds',
    'pnl',
    'settings',
  ],
  head_chef: ['inventory', 'suppliers', 'production', 'recipes', 'menu', 'kds'],
  line_staff: ['kds', 'clock'],
} as const satisfies Record<KitchenRole, readonly KitchenCapability[]>;

export function kitchenRoleHasCapability(
  role: KitchenRole,
  capability: KitchenCapability,
): boolean {
  return (KITCHEN_CAPS[role] as readonly KitchenCapability[]).includes(capability);
}
