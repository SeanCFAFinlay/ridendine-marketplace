import { describe, expect, it } from 'vitest';
import {
  hasRole,
  hasAnyRole,
  isAdmin,
  canAccessAdminDashboard,
  canManageOrders,
  canManageChefs,
  canManageDrivers,
  canViewFinancials,
  canProcessRefunds,
  hasPermission,
  type UserRoles,
  type UserRole,
} from './permissions.service';

// --- Test fixtures ---

function makeRoles(roles: UserRole[]): UserRoles {
  return {
    isCustomer: roles.includes('customer'),
    isChef: roles.includes('chef'),
    isDriver: roles.includes('driver'),
    isOpsAdmin: roles.includes('ops_admin'),
    isSuperAdmin: roles.includes('super_admin'),
    roles,
    highestRole: roles.at(-1) ?? null,
  };
}

const CUSTOMER = makeRoles(['customer']);
const CHEF = makeRoles(['chef']);
const DRIVER = makeRoles(['driver']);
const OPS_ADMIN = makeRoles(['ops_admin']);
const SUPER_ADMIN = makeRoles(['super_admin']);
const MULTI_ROLE = makeRoles(['customer', 'chef']);
const NO_ROLES = makeRoles([]);

// --- hasRole ---

describe('hasRole', () => {
  it('returns true when user has the role', () => {
    expect(hasRole(CUSTOMER, 'customer')).toBe(true);
    expect(hasRole(CHEF, 'chef')).toBe(true);
  });

  it('returns false when user does not have the role', () => {
    expect(hasRole(CUSTOMER, 'chef')).toBe(false);
    expect(hasRole(DRIVER, 'ops_admin')).toBe(false);
  });

  it('works with multi-role users', () => {
    expect(hasRole(MULTI_ROLE, 'customer')).toBe(true);
    expect(hasRole(MULTI_ROLE, 'chef')).toBe(true);
    expect(hasRole(MULTI_ROLE, 'driver')).toBe(false);
  });

  it('returns false for empty role set', () => {
    expect(hasRole(NO_ROLES, 'customer')).toBe(false);
  });
});

// --- hasAnyRole ---

describe('hasAnyRole', () => {
  it('returns true when user has at least one of the specified roles', () => {
    expect(hasAnyRole(OPS_ADMIN, ['ops_admin', 'super_admin'])).toBe(true);
    expect(hasAnyRole(CHEF, ['chef', 'ops_admin'])).toBe(true);
  });

  it('returns false when user has none of the specified roles', () => {
    expect(hasAnyRole(CUSTOMER, ['chef', 'driver'])).toBe(false);
    expect(hasAnyRole(NO_ROLES, ['chef', 'ops_admin'])).toBe(false);
  });

  it('returns false for empty role list', () => {
    expect(hasAnyRole(SUPER_ADMIN, [])).toBe(false);
  });
});

// --- isAdmin ---

describe('isAdmin', () => {
  it('returns true for ops_admin', () => {
    expect(isAdmin(OPS_ADMIN)).toBe(true);
  });

  it('returns true for super_admin', () => {
    expect(isAdmin(SUPER_ADMIN)).toBe(true);
  });

  it('returns false for customer', () => {
    expect(isAdmin(CUSTOMER)).toBe(false);
  });

  it('returns false for chef', () => {
    expect(isAdmin(CHEF)).toBe(false);
  });

  it('returns false for driver', () => {
    expect(isAdmin(DRIVER)).toBe(false);
  });
});

// --- canAccessAdminDashboard ---

describe('canAccessAdminDashboard', () => {
  it('grants access to ops_admin', () => {
    expect(canAccessAdminDashboard(OPS_ADMIN)).toBe(true);
  });

  it('grants access to super_admin', () => {
    expect(canAccessAdminDashboard(SUPER_ADMIN)).toBe(true);
  });

  it('denies access to chef', () => {
    expect(canAccessAdminDashboard(CHEF)).toBe(false);
  });

  it('denies access to customer', () => {
    expect(canAccessAdminDashboard(CUSTOMER)).toBe(false);
  });
});

// --- canManageOrders ---

describe('canManageOrders', () => {
  it('allows ops_admin to manage orders', () => {
    expect(canManageOrders(OPS_ADMIN)).toBe(true);
  });

  it('allows super_admin to manage orders', () => {
    expect(canManageOrders(SUPER_ADMIN)).toBe(true);
  });

  it('allows chef to manage orders', () => {
    expect(canManageOrders(CHEF)).toBe(true);
  });

  it('denies customer from managing orders', () => {
    expect(canManageOrders(CUSTOMER)).toBe(false);
  });

  it('denies driver from managing orders', () => {
    expect(canManageOrders(DRIVER)).toBe(false);
  });
});

// --- canManageChefs ---

describe('canManageChefs', () => {
  it('allows ops_admin to manage chefs', () => {
    expect(canManageChefs(OPS_ADMIN)).toBe(true);
  });

  it('allows super_admin to manage chefs', () => {
    expect(canManageChefs(SUPER_ADMIN)).toBe(true);
  });

  it('denies chef from managing other chefs', () => {
    expect(canManageChefs(CHEF)).toBe(false);
  });

  it('denies customer from managing chefs', () => {
    expect(canManageChefs(CUSTOMER)).toBe(false);
  });
});

// --- canManageDrivers ---

describe('canManageDrivers', () => {
  it('allows ops_admin to manage drivers', () => {
    expect(canManageDrivers(OPS_ADMIN)).toBe(true);
  });

  it('allows super_admin to manage drivers', () => {
    expect(canManageDrivers(SUPER_ADMIN)).toBe(true);
  });

  it('denies driver from managing other drivers', () => {
    expect(canManageDrivers(DRIVER)).toBe(false);
  });
});

// --- canViewFinancials ---

describe('canViewFinancials', () => {
  it('allows super_admin to view financials', () => {
    expect(canViewFinancials(SUPER_ADMIN)).toBe(true);
  });

  it('denies ops_admin from viewing financials', () => {
    expect(canViewFinancials(OPS_ADMIN)).toBe(false);
  });

  it('denies chef from viewing financials', () => {
    expect(canViewFinancials(CHEF)).toBe(false);
  });

  it('denies customer from viewing financials', () => {
    expect(canViewFinancials(CUSTOMER)).toBe(false);
  });
});

// --- canProcessRefunds ---

describe('canProcessRefunds', () => {
  it('allows ops_admin to process refunds', () => {
    expect(canProcessRefunds(OPS_ADMIN)).toBe(true);
  });

  it('allows super_admin to process refunds', () => {
    expect(canProcessRefunds(SUPER_ADMIN)).toBe(true);
  });

  it('denies chef from processing refunds', () => {
    expect(canProcessRefunds(CHEF)).toBe(false);
  });

  it('denies customer from processing refunds', () => {
    expect(canProcessRefunds(CUSTOMER)).toBe(false);
  });
});

// --- hasPermission ---

describe('hasPermission', () => {
  it('grants customer view_orders permission', () => {
    expect(hasPermission(CUSTOMER, 'view_orders')).toBe(true);
  });

  it('denies customer manage_orders permission', () => {
    expect(hasPermission(CUSTOMER, 'manage_orders')).toBe(false);
  });

  it('grants chef manage_orders permission', () => {
    expect(hasPermission(CHEF, 'manage_orders')).toBe(true);
  });

  it('denies chef manage_chefs permission', () => {
    expect(hasPermission(CHEF, 'manage_chefs')).toBe(false);
  });

  it('grants ops_admin manage_chefs permission', () => {
    expect(hasPermission(OPS_ADMIN, 'manage_chefs')).toBe(true);
  });

  it('grants ops_admin process_refunds permission', () => {
    expect(hasPermission(OPS_ADMIN, 'process_refunds')).toBe(true);
  });

  it('denies ops_admin view_financials permission', () => {
    expect(hasPermission(OPS_ADMIN, 'view_financials')).toBe(false);
  });

  it('grants super_admin view_financials permission', () => {
    expect(hasPermission(SUPER_ADMIN, 'view_financials')).toBe(true);
  });

  it('grants super_admin manage_platform permission', () => {
    expect(hasPermission(SUPER_ADMIN, 'manage_platform')).toBe(true);
  });

  it('denies driver manage_orders permission', () => {
    expect(hasPermission(DRIVER, 'manage_orders')).toBe(false);
  });

  it('grants driver view_orders permission', () => {
    expect(hasPermission(DRIVER, 'view_orders')).toBe(true);
  });

  it('returns false for empty role set', () => {
    expect(hasPermission(NO_ROLES, 'view_orders')).toBe(false);
  });

  it('grants permission via any matching role for multi-role user', () => {
    // customer+chef user inherits chef's manage_orders permission
    expect(hasPermission(MULTI_ROLE, 'manage_orders')).toBe(true);
  });
});
