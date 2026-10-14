import { createAdminClient, getStorefrontMenu, getStorefrontBySlug } from '@ridendine/db';
import { successResponse, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = createAdminClient() as any;

    let storefrontId: string | null = null;
    const bySlug = await getStorefrontBySlug(client, id);
    if (bySlug) {
      storefrontId = bySlug.id;
    } else {
      const { data: sf } = await client
        .from('chef_storefronts')
        .select('id')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();
      if (sf) {
        storefrontId = sf.id;
      }
    }

    if (!storefrontId) return errorResponse('NOT_FOUND', 'Storefront not found', 404);

    const [menu, { data: options }] = await Promise.all([
      getStorefrontMenu(client, storefrontId, { includeUnavailable: false }),
      client
        .from('menu_item_options')
        .select('*, menu_item_option_values(*)')
        .in(
          'menu_item_id',
          (
            await client
              .from('menu_items')
              .select('id')
              .eq('storefront_id', storefrontId)
              .eq('is_available', true)
          ).data?.map((item: { id: string }) => item.id) ?? []
        ),
    ]);

    const optionsByMenuItem = new Map<string, any[]>();
    for (const option of options ?? []) {
      const current = optionsByMenuItem.get(option.menu_item_id) ?? [];
      current.push(option);
      optionsByMenuItem.set(option.menu_item_id, current);
    }

    const categories = menu.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        soldOut: Boolean((item as any).is_sold_out),
        options: optionsByMenuItem.get(item.id) ?? [],
      })),
    }));

    return successResponse({ categories });
  } catch (error) {
    console.error('Error fetching storefront menu:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
