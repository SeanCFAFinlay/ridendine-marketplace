// ==========================================
// CHEF-ADMIN LABOUR API — export a pay period (Phase D.1, Path A)
//
// Returns hours × rate per staff as CSV (?format=csv) or JSON, for a Canadian
// payroll provider. No tax/CPP/EI — Path A leaves withholding to the provider.
// The period must be locked first; exporting marks it exported.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  computePayrollRun,
  payrollRunToCsv,
  type PayrollStaffInput,
  type TimeEntryLike,
} from '@ridendine/engine';
import { getEngine, getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: period } = await admin
      .from('pay_periods')
      .select('*')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!period) return errorResponse('NOT_FOUND', 'Pay period not found', 404);
    if (period.status === 'open') {
      return errorResponse('CONFLICT', 'Lock the pay period before exporting', 409);
    }

    const [{ data: staffRows }, { data: entryRows }] = await Promise.all([
      admin.from('kitchen_staff').select('id, name, role, hourly_rate').eq('kitchen_id', ctx.kitchenId),
      admin
        .from('time_entries')
        .select('staff_id, clock_in, clock_out, hourly_rate')
        .eq('kitchen_id', ctx.kitchenId)
        .gte('clock_in', `${period.starts_on}T00:00:00.000Z`)
        .lte('clock_in', `${period.ends_on}T23:59:59.999Z`),
    ]);

    const entriesByStaff = new Map<string, TimeEntryLike[]>();
    for (const e of entryRows ?? []) {
      if (!e.staff_id) continue;
      const list = entriesByStaff.get(e.staff_id) ?? [];
      list.push({
        clock_in: e.clock_in,
        clock_out: e.clock_out,
        hourly_rate: Number(e.hourly_rate ?? 0),
        staff_id: e.staff_id,
      });
      entriesByStaff.set(e.staff_id, list);
    }

    const staff: PayrollStaffInput[] = (staffRows ?? [])
      .map((s) => ({
        staffId: s.id,
        name: s.name,
        role: s.role ?? null,
        hourlyRate: Number(s.hourly_rate ?? 0),
        entries: entriesByStaff.get(s.id) ?? [],
      }))
      .filter((s) => s.entries.length > 0);

    const run = computePayrollRun(staff, new Date());

    // Exporting finalises the period (idempotent — re-export is allowed).
    await admin
      .from('pay_periods')
      .update({ status: 'exported', exported_at: new Date().toISOString() })
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId);

    await getEngine().audit.log({
      action: 'update',
      entityType: 'pay_period',
      entityId: id,
      actor: ctx.actor,
      afterState: { status: 'exported', staff: run.staffCount, gross: run.totalGross, format },
    });

    if (format === 'csv') {
      return new Response(payrollRunToCsv(run), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="payroll-${period.starts_on}_${period.ends_on}.csv"`,
        },
      });
    }

    return successResponse({
      payPeriod: { id: period.id, startsOn: period.starts_on, endsOn: period.ends_on, status: 'exported' },
      run,
    });
  } catch (error) {
    console.error('Error exporting pay period:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
