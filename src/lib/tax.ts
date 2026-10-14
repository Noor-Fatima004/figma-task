// src/lib/tax.ts  (koi "use client" nahi)
export const TAX_RATE = 0.0825;
export const FREE_SHIPPING_THRESHOLD = 5000;
export const SHIPPING_FLAT = 500;

const money = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export function computeTotals(subtotal: number) {
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const taxAmount = money(subtotal * TAX_RATE);
  return { subtotal: money(subtotal), shippingFee, taxAmount, total: money(subtotal + shippingFee + taxAmount) };
}