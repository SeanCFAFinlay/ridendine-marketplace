/**
 * Native Bridge & Hardware Integration for RideNDine Courier App
 * Supports both PWA browser mode and Capacitor Native (iOS / Android) shells.
 */

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

/**
 * Triggers physical device haptic feedback when a new dispatch offer arrives.
 */
export function triggerCourierHaptic(): void {
  if (typeof window === 'undefined') return;

  // Try standard web vibration API
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // 3 short pulsing vibrations
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }
}

/**
 * Plays an urgent acoustic chime via Web Audio API for loud vehicle cabins.
 */
export function playDispatchChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (high)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone (higher harmony)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
  } catch {
    // Non-fatal if audio context is blocked by browser policy
  }
}
