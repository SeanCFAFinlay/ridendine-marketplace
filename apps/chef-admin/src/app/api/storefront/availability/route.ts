// ==========================================
// STOREFRONT WEEKLY AVAILABILITY (chef_availability)
// Phase 7 — IRR-032
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface SlotInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

function normalizeTime(t: string): string | null {
  const s = String(t).trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function validateSlots(slots: SlotInput[]): string | null {
  if (!Array.isArray(slots) || slots.length === 0) {
    return 'slots array is required';
  }
  const seen = new Set<number>();
  for (const slot of slots) {
    if (
      typeof slot.day_of_week !== 'number' ||
      slot.day_of_week < 0 ||
      slot.day_of_week > 6
    ) {
      return `Invalid day_of_week ${slot.day_of_week}`;
    }
    if (seen.has(slot.day_of_week)) return `Duplicate day ${slot.day_of_week}`;
    seen.add(slot.day_of_week);
    const st = normalizeTime(slot.start_time);
    const en = normalizeTime(slot.end_time);
    if (!st || !en) return 'start_time and end_time must be HH:MM or HH:MM:SS';
  }
  return null;
}

/**
 * GET — current weekly rows for the authenticated chef's storefront.
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('chef_availability')
      .select('id, day_of_week, start_time, end_time, is_available')
      .eq('storefront_id', chefContext.storefrontId)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('availability GET', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load availability', 500);
    }

    return successResponse({
      slots: (data ?? []).map((row) => ({
        ...row,
        dayLabel: DAY_LABELS[row.day_of_week] ?? String(row.day_of_week),
      })),
    });
  } catch (e) {
    console.error('availability GET', e);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PUT — replace all weekly rows for this storefront (transactional delete + insert).
 */
export async function PUT(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const slots = body.slots as SlotInput[];
    const err = validateSlots(slots);
    if (err) {
      return errorResponse('VALIDATION_ERROR', err, 400);
    }

    const admin = createAdminClient();
    const storefrontId = chefContext.storefrontId;

    const { error: delErr } = await admin
      .from('chef_availability')
      .delete()
      .eq('storefront_id', storefrontId);

    if (delErr) {
      console.error('availability delete', delErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to update availability', 500);
    }

    const rows = slots.map((s) => ({
      storefront_id: storefrontId,
      day_of_week: s.day_of_week,
      start_time: normalizeTime(s.start_time)!,
      end_time: normalizeTime(s.end_time)!,
      is_available: Boolean(s.is_available),
    }));

    const { error: insErr } = await admin.from('chef_availability').insert(rows);
    if (insErr) {
      console.error('availability insert', insErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to save availability', 500);
    }

    return successResponse({ saved: rows.length });
  } catch (e) {
    console.error('availability PUT', e);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
