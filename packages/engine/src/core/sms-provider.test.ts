// ==========================================
// TWILIO SMS PROVIDER TESTS
// TDD: Red-Green-Refactor
// ==========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTwilioProvider } from './sms-provider';

const ORIG_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

function setTwilioEnv() {
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'auth-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
}

describe('createTwilioProvider', () => {
  describe('name', () => {
    it('has the correct provider name', () => {
      const provider = createTwilioProvider();
      expect(provider.name).toBe('twilio-sms');
    });
  });

  describe('isAvailable()', () => {
    it('returns false when all Twilio env vars are unset', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_FROM_NUMBER;
      const provider = createTwilioProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns false when only TWILIO_ACCOUNT_SID is set', () => {
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_FROM_NUMBER;
      process.env.TWILIO_ACCOUNT_SID = 'AC123';
      const provider = createTwilioProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true when all three Twilio env vars are set', () => {
      setTwilioEnv();
      const provider = createTwilioProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('deliver()', () => {
    it('returns no_recipient_phone when data has no phone field', async () => {
      setTwilioEnv();
      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'order_placed',
        userId: 'user-1',
        title: 'New Order',
        body: 'You have a new order.',
        data: {},
      });
      expect(result).toEqual({ delivered: false, error: 'no_recipient_phone' });
    });

    it('returns no_recipient_phone when data is undefined', async () => {
      setTwilioEnv();
      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'delivery_offer',
        userId: 'user-2',
        title: 'Delivery Offer',
        body: 'New delivery available.',
      });
      expect(result).toEqual({ delivered: false, error: 'no_recipient_phone' });
    });

    it('calls Twilio API with correct URL, basic auth, and form body on happy path', async () => {
      setTwilioEnv();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
      vi.stubGlobal('fetch', mockFetch);

      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'order_delivered',
        userId: 'user-3',
        title: 'Order Delivered',
        body: 'Your order has been delivered.',
        data: { phone: '+14155551234' },
      });

      expect(result).toEqual({ delivered: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('AC123');
      expect(url).toContain('Messages.json');

      const authHeader = (options.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toMatch(/^Basic /);

      const body = options.body as string;
      expect(body).toContain('From=');
      expect(body).toContain('To=');
      expect(body).toContain('Body=');
      expect(decodeURIComponent(body)).toContain('+14155551234');
    });

    it('returns delivered: false when Twilio returns non-2xx', async () => {
      setTwilioEnv();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => '{"message":"Invalid phone number"}',
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'order_placed',
        userId: 'user-4',
        title: 'New Order',
        body: 'Chef notification.',
        data: { phone: '+1invalid' },
      });

      expect(result.delivered).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('returns delivered: false when fetch throws', async () => {
      setTwilioEnv();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'delivery_offer',
        userId: 'user-5',
        title: 'Offer',
        body: 'New delivery.',
        data: { phone: '+15005550006' },
      });

      expect(result).toEqual({ delivered: false, error: 'network error' });
    });

    it('returns delivered: false when env vars missing at deliver time', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_FROM_NUMBER;

      const provider = createTwilioProvider();
      const result = await provider.deliver({
        type: 'order_placed',
        userId: 'user-6',
        title: 'Test',
        body: 'Body',
        data: { phone: '+15005550006' },
      });

      expect(result.delivered).toBe(false);
    });
  });
});
