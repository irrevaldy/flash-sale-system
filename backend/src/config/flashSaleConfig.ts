// src/config/flashSaleConfig.ts
// ============================================================
// ✅ CONFIGURE YOUR FLASH SALE HERE
// ============================================================

export const FLASH_SALE_CONFIG = {
  // Product ID from your MongoDB products collection
  productId: '6993cf4cb17dbd56cce28ac0',

  // Limited stock available for this flash sale
  totalStock: 50,

  // Sale window — use ISO 8601 strings (server local time)
  // Example: '2026-02-18T10:00:00' = Feb 18 2026 at 10:00 AM
  startTime: new Date('2026-02-17T20:37:00'),
  endTime:   new Date('2026-02-18T12:00:00'),

  // Price during flash sale (can differ from normal price)
  flashPrice: 29.99,
};

// ── Derived helpers ──
export function getFlashSaleStatus(): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  if (now < FLASH_SALE_CONFIG.startTime) return 'upcoming';
  if (now > FLASH_SALE_CONFIG.endTime)   return 'ended';
  return 'active';
}
