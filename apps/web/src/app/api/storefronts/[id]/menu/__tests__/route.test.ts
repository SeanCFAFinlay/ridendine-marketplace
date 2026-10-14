/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetStorefrontMenu = jest.fn();
const mockGetStorefrontBySlug = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => mockCreateAdminClient(),
  getStorefrontMenu: (...args: unknown[]) => mockGetStorefrontMenu(...args),
  getStorefrontBySlug: (...args: unknown[]) => mockGetStorefrontBySlug(...args),
}));

jest.mock('@/lib/engine', () => ({
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
}));

import { GET } from '../route';

function buildClient(opts: {
  storefrontExists: boolean;
  optionsRows?: Array<Record<string, unknown>>;
  menuItemRows?: Array<{ id: string }>;
}) {
  return {
    from(table: string) {
      if (table === 'chef_storefronts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.storefrontExists ? { id: 'sf-1' } : null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'menu_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: opts.menuItemRows ?? [] }),
            }),
          }),
        };
      }
      if (table === 'menu_item_options') {
        return {
          select: () => ({
            in: async () => ({ data: opts.optionsRows ?? [] }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  };
}

describe('GET /api/storefronts/[id]/menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when the storefront is inactive or missing', async () => {
    mockCreateAdminClient.mockReturnValue(buildClient({ storefrontExists: false }));
    const params = { params: Promise.resolve({ id: 'sf-1' }) };
    const res = await GET(new Request('http://localhost/api/storefronts/sf-1/menu'), params);
    expect(res.status).toBe(404);
  });

  it('groups options under each menu item and propagates soldOut', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        storefrontExists: true,
        menuItemRows: [{ id: 'menu-1' }],
        optionsRows: [
          {
            id: 'opt-1',
            menu_item_id: 'menu-1',
            name: 'Spice',
            menu_item_option_values: [{ id: 'v-1', name: 'Hot', price_adjustment: 2 }],
          },
        ],
      }),
    );
    mockGetStorefrontMenu.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Mains',
        items: [{ id: 'menu-1', name: 'Pad Thai', is_sold_out: true }],
      },
    ]);

    const params = { params: Promise.resolve({ id: 'sf-1' }) };
    const res = await GET(new Request('http://localhost/api/storefronts/sf-1/menu'), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.categories[0].items[0]).toEqual(
      expect.objectContaining({
        id: 'menu-1',
        soldOut: true,
        options: expect.arrayContaining([
          expect.objectContaining({ id: 'opt-1', name: 'Spice' }),
        ]),
      }),
    );
    expect(mockGetStorefrontMenu).toHaveBeenCalledWith(
      expect.any(Object),
      'sf-1',
      expect.objectContaining({ includeUnavailable: false }),
    );
  });

  it('resolves menu when accessed by slug', async () => {
    mockGetStorefrontBySlug.mockResolvedValue({ id: 'sf-slug-1', slug: 'bep-ba-muoi' });
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        storefrontExists: false, // fallback table not needed because slug matched
        menuItemRows: [{ id: 'menu-1' }],
      }),
    );
    mockGetStorefrontMenu.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Mains',
        items: [{ id: 'menu-1', name: 'Com Suon', is_sold_out: false }],
      },
    ]);

    const params = { params: Promise.resolve({ id: 'bep-ba-muoi' }) };
    const res = await GET(new Request('http://localhost/api/storefronts/bep-ba-muoi/menu'), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.categories[0].items[0].name).toBe('Com Suon');
    expect(mockGetStorefrontMenu).toHaveBeenCalledWith(
      expect.any(Object),
      'sf-slug-1',
      expect.objectContaining({ includeUnavailable: false }),
    );
  });
});
