export function vibrate(ms = 10) {
  try { navigator.vibrate?.(ms) } catch (_) {}
}
