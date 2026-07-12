// ==========================================
// CHEF-ADMIN KITCHEN API — multi-brand KDS board (Ghost-Kitchen Phase B.1)
//
// One consolidated kitchen display for the whole commissary: aggregates active
// kitchen_tickets across EVERY brand storefront under the kitchen, groups them
// by station (not by brand), and tags each ticket with its brand + colour. The
// existing per-brand /api/kitchen/overview is unchanged (independent chefs).
//
// Read-only. Realtime hydration is handled client-side on kitchen_tickets, same
// as the single-brand board.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const ACTIVE_TICKET_STATUSES = ['new', 'accepted', 'preparing', 'packing', 'ready', 'problem'];

// Deterministic brand tag colours (assigned by stable brand order).
const BRAND_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;

    const [{ data: storefronts }, { data: stationRows }] = await Promise.all([
      admin.from('chef_storefronts').select('id, name').eq('kitchen_id', ctx.kitchenId).order('name', { ascending: true }),
      admin.from('kitchen_stations').select('id, name, sort_order').eq('kitchen_id', ctx.kitchenId).eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    const brands = (storefronts ?? []) as { id: string; name: string }[];
    if (brands.length === 0) {
      return successResponse({ brands: [], stations: [], ticketCount: 0 });
    }
    const brandById = new Map(
      brands.map((b, idx) => [
        b.id,
        { storefrontId: b.id, name: b.name, color: BRAND_COLORS[idx % BRAND_COLORS.length] },
      ]),
    );
    const stations = (stationRows ?? []) as { id: string; name: string; sort_order: number }[];
    const stationNameById = new Map(stations.map((s) => [s.id, s.name]));

    const brandIds = brands.map((b) => b.id);
    const { data: ticketRows } = await admin
      .from('kitchen_tickets')
      .select(
        'id, order_id, storefront_id, kitchen_status, priority, station_id, created_at, ' +
          'order:orders ( order_number, created_at, estimated_ready_at ), ' +
          'items:kitchen_ticket_items ( quantity, station_id, modifiers_snapshot, allergen_flags, special_instructions, menu_item:menu_items ( name ) )',
      )
      .in('storefront_id', brandIds)
      .in('kitchen_status', ACTIVE_TICKET_STATUSES)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    type TicketRow = {
      id: string;
      order_id: string;
      storefront_id: string;
      kitchen_status: string;
      priority: number;
      station_id: string | null;
      created_at: string;
      order?: { order_number?: string; created_at?: string; estimated_ready_at?: string } | null;
      items?: {
        quantity?: number;
        station_id?: string | null;
        modifiers_snapshot?: unknown;
        allergen_flags?: string[];
        special_instructions?: string | null;
        menu_item?: { name?: string } | null;
      }[];
    };

    const tickets = ((ticketRows ?? []) as unknown as TicketRow[]).map((t) => ({
      ticketId: t.id,
      orderId: t.order_id,
      orderNumber: t.order?.order_number ?? null,
      brand: brandById.get(t.storefront_id) ?? { storefrontId: t.storefront_id, name: 'Brand', color: '#6B7280' },
      stationId: t.station_id ?? null,
      station: t.station_id ? stationNameById.get(t.station_id) ?? 'Station' : null,
      kitchenStatus: t.kitchen_status,
      priority: t.priority,
      placedAt: t.order?.created_at ?? t.created_at,
      dueAt: t.order?.estimated_ready_at ?? null,
      items: (t.items ?? []).map((it) => ({
        name: it.menu_item?.name ?? 'Item',
        qty: Number(it.quantity ?? 1),
        station: it.station_id ? stationNameById.get(it.station_id) ?? null : null,
        modifiers: Array.isArray(it.modifiers_snapshot) ? it.modifiers_snapshot : [],
        allergenFlags: it.allergen_flags ?? [],
        specialInstructions: it.special_instructions ?? null,
      })),
    }));

    // Group by STATION (not brand). Keep configured stations in order, plus an
    // Unassigned bucket for tickets with no station.
    const columns = new Map<string, { stationId: string | null; name: string; tickets: typeof tickets }>();
    for (const s of stations) columns.set(s.id, { stationId: s.id, name: s.name, tickets: [] });
    columns.set('__unassigned', { stationId: null, name: 'Unassigned', tickets: [] });
    for (const t of tickets) {
      const key = t.stationId && columns.has(t.stationId) ? t.stationId : '__unassigned';
      columns.get(key)!.tickets.push(t);
    }
    const stationColumns = [...columns.values()].filter((c) => c.stationId !== null || c.tickets.length > 0);

    return successResponse({
      brands: [...brandById.values()],
      stations: stationColumns,
      ticketCount: tickets.length,
    });
  } catch (error) {
    console.error('Error building kitchen board:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
