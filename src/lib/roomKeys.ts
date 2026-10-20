// Rakho: src/lib/roomKeys.ts
// Sirf yehi 5 rooms navbar dropdown aur /rooms page mein dikhengi.
// key = category ka slug (database wala `key`), label = dropdown mein dikhne wala naam.

export const ROOM_LIST = [
  { key: "living", label: "Living room" },
  { key: "dining", label: "Dining room" },
  { key: "bedroom", label: "Bedroom" },
  { key: "office", label: "Home Office" },
  { key: "outdoor", label: "Outdoor" },
] as const;

export const ROOM_KEYS: string[] = ROOM_LIST.map((r) => r.key);