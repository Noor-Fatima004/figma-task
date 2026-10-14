// lib/cart-config.ts
// Shipping + tax rules. Dono client (cartStore) aur server (API routes) isse import karte hain.
// Yeh file PURE CONSTANTS hai — koi React, koi hooks nahi — isliye safe hai.

export const FREE_SHIPPING_THRESHOLD = 5000; // is amount ya usse zyada par shipping free
export const SHIPPING_FLAT = 500;            // threshold se kam par shipping charge
export const TAX_RATE = 0.0825;              // 8.25%