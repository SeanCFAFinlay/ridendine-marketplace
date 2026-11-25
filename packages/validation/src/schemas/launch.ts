import { z } from 'zod';

/**
 * The wording shown beside the sign-up button, saved with every sign-up as the
 * record of what the person agreed to. The form and the API both read it from
 * here so they cannot drift.
 */
export const LAUNCH_CONSENT_TEXT =
  'RideNDine, Hamilton, Ontario will email you when ordering opens, plus occasional launch news. You can unsubscribe at any time.';

export const launchSignupSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email('Enter a valid email address'),
  source: z.enum(['home', 'coming-soon']).default('home'),
  /** Honeypot. Hidden from people; only bots fill it in. */
  company: z.string().optional(),
});

export type LaunchSignupInput = z.infer<typeof launchSignupSchema>;
