export function isMobile(): boolean {
  // Prefer feature detection for touch-capable devices rather than userAgent
  if (typeof navigator !== "undefined") {
    // navigator.maxTouchPoints is set when DevTools device emulation is enabled
    if (
      (navigator as any).maxTouchPoints &&
      (navigator as any).maxTouchPoints > 0
    ) {
      return true;
    }
    // older browsers may have "ontouchstart"
    if (typeof (window as any).ontouchstart !== "undefined") {
      return true;
    }
    // fallback to UA sniffing as last resort
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
  return false;
}
