// Guest mode helper (browser only).
// Guest = bina login ke browse karne wala visitor. Uska cart/wishlist isi device par
// guestId ke saath saved rehta hai, login page par redirect hone se kuch delete nahi hota.

const ID_KEY = "naltar_guest_id";
const COOKIE = "guest";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 din

const canUseDom = () => typeof window !== "undefined";

export function getGuestId(): string | null {
  if (!canUseDom()) return null;
  try {
    return localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}

// "Continue as a guest" par call karo
export function startGuest(): string {
  const id = getGuestId() ?? crypto.randomUUID();
  try {
    localStorage.setItem(ID_KEY, id);
  } catch {
    /* storage blocked: guest cookie phir bhi chalegi */
  }
  document.cookie = `${COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  return id;
}

export function isGuest(): boolean {
  if (!canUseDom()) return false;
  return document.cookie.split("; ").some((c) => c === `${COOKIE}=1`);
}

// Login/signup hone par guest flag hatao. guestId aur uska data JAAN BOOJH kar nahi hatate,
// taake wo user account me merge ho sake. Merge ke baad clearGuestData() call karo.
export function endGuestSession(): void {
  if (!canUseDom()) return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function clearGuestData(): void {
  if (!canUseDom()) return;
  try {
    localStorage.removeItem(ID_KEY);
  } catch {
    /* ignore */
  }
}