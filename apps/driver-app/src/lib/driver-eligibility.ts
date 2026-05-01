import type { Driver } from '@ridendine/db';

/** Approved drivers may use dispatch APIs and the active delivery experience. */
export function isApprovedDriver(driver: Driver | null): driver is Driver {
  return driver != null && driver.status === 'approved';
}
