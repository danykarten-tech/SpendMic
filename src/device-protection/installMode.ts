/**
 * A browser tab and an installed PWA share the same origin, but only the
 * installed app is subject to the product activation gate. This deliberately
 * does not use user-agent detection: the browser exposes the app display mode
 * directly on supported platforms.
 */
export function isRunningInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;

  // Safari on iPhone/iPad exposes this legacy flag for Home Screen apps.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
