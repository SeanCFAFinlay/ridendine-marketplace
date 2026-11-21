/**
 * @jest-environment node
 */
const mockGetChefActorContext = jest.fn();
const mockGetReviewStorefrontId = jest.fn();
const mockSetReviewChefResponse = jest.fn();

jest.mock('@/lib/engine', () => ({
  getChefActorContext: (...a: unknown[]) => mockGetChefActorContext(...a),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, error: { code, message } }, { status }),
  successResponse: (data: unknown, status = 200) => Response.json({ success: true, data }, { status }),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
  getReviewStorefrontId: (...a: unknown[]) => mockGetReviewStorefrontId(...a),
  setReviewChefResponse: (...a: unknown[]) => mockSetReviewChefResponse(...a),
}));

import { PUT, DELETE } from '../route';

const params = { params: Promise.resolve({ id: 'review-1' }) };
const put = (body: unknown) =>
  PUT(
    new Request('http://localhost/api/reviews/review-1/response', {
      method: 'PUT',
      body: JSON.stringify(body),
    }) as never,
    params
  );

describe('PUT/DELETE /api/reviews/[id]/response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChefActorContext.mockResolvedValue({ chefId: 'chef-1', storefrontId: 'store-1' });
    mockGetReviewStorefrontId.mockResolvedValue('store-1');
    mockSetReviewChefResponse.mockResolvedValue({ chef_response: 'Thanks!', chef_responded_at: '2026-11-21T00:00:00Z' });
  });

  it('rejects unauthenticated callers', async () => {
    mockGetChefActorContext.mockResolvedValue(null);
    const res = await put({ response: 'Thanks!' });
    expect(res.status).toBe(401);
    expect(mockSetReviewChefResponse).not.toHaveBeenCalled();
  });

  it("returns 404 for another kitchen's review", async () => {
    mockGetReviewStorefrontId.mockResolvedValue('store-other');
    const res = await put({ response: 'Thanks!' });
    expect(res.status).toBe(404);
    expect(mockSetReviewChefResponse).not.toHaveBeenCalled();
  });

  it('validates the reply text', async () => {
    expect((await put({ response: '   ' })).status).toBe(400);
    expect((await put({ response: 'x'.repeat(1001) })).status).toBe(400);
    expect(mockSetReviewChefResponse).not.toHaveBeenCalled();
  });

  it('saves a trimmed reply scoped to the chef storefront', async () => {
    const res = await put({ response: '  Thanks!  ' });
    expect(res.status).toBe(200);
    expect(mockSetReviewChefResponse).toHaveBeenCalledWith({}, 'review-1', 'store-1', 'Thanks!');
  });

  it('clears the reply on DELETE', async () => {
    mockSetReviewChefResponse.mockResolvedValue({ chef_response: null, chef_responded_at: null });
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }) as never, params);
    expect(res.status).toBe(200);
    expect(mockSetReviewChefResponse).toHaveBeenCalledWith({}, 'review-1', 'store-1', null);
  });
});
