// src/lib/products.ts
// Products ka data ek hi jagah: home ka slider aur product detail page dono yahin se padhte hain.
// Baad mein yeh array database/API se aa sakta hai, baqi code same rahega.

// Tabs: key = product.category se match hota hai, label = jo user ko dikhta hai
export const CATEGORIES = [
  { key: "living-room", label: "Living Room" },
  { key: "dining", label: "Dining" },
  { key: "bedroom", label: "Bedroom" },
  { key: "seating", label: "Seating" },
  { key: "tables", label: "Tables" },
  { key: "storage", label: "Storage" },
  { key: "lighting", label: "Lighting" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export type Product = {
  id: string; // slug bhi yehi hai: /product/<id>
  name: string;
  material: string;
  price: number;
  category: CategoryKey;
  image: string; // main image (card + detail page)
  images: string[]; // detail page ki gallery (pehli image main wali hoti hai)
  badge?: string;
  description?: string; // na ho to detail page apna default text banata hai
  dimensions?: string; // jaise "W 220 × D 95 × H 82 cm"
};

// Image path: /public/frontStoreImages/products/<id>.avif
// Ek se zyada images chahiye to images mein aur paths daal do.
const item = (
  category: CategoryKey,
  id: string,
  name: string,
  material: string,
  price: number,
  badge?: string
): Product => {
  const image = `/frontStoreImages/products/${id}.avif`;
  return { id, name, material, price, category, image, images: [image], badge };
};

export const PRODUCTS: Product[] = [
  item("living-room", "emerald-velvet-sofa", "Emerald Velvet Sofa", "Velvet, solid wood legs", 289000, "New"),
  item("living-room", "linen-corner-sectional", "Linen Corner Sectional", "Linen blend, oak frame", 349000),
  item("living-room", "boucle-accent-chair", "Bouclé Accent Chair", "Bouclé, beech legs", 124000),
  item("living-room", "brass-arc-floor-lamp", "Brass Arc Floor Lamp", "Brass, linen shade", 68000),

  item("dining", "oak-dining-table", "Oak Dining Table", "Solid oak", 215000, "Best seller"),
  item("dining", "cane-dining-chair", "Cane Dining Chair", "Rattan cane, ash", 34500),
  item("dining", "round-pedestal-table", "Round Pedestal Table", "Walnut veneer", 168000),
  item("dining", "linen-dining-bench", "Linen Dining Bench", "Linen, oak legs", 59000),

  item("bedroom", "upholstered-platform-bed", "Upholstered Platform Bed", "Linen, solid wood", 245000, "New"),
  item("bedroom", "oak-bedside-table", "Oak Bedside Table", "Solid oak", 42000),
  item("bedroom", "six-drawer-dresser", "Six-Drawer Dresser", "Oak veneer", 178000),
  item("bedroom", "velvet-bedroom-bench", "Velvet Bedroom Bench", "Velvet, brass feet", 46000),

  item("seating", "leather-lounge-chair", "Leather Lounge Chair", "Full-grain leather", 198000, "Best seller"),
  item("seating", "rattan-armchair", "Rattan Armchair", "Rattan, teak", 87000),
  item("seating", "swivel-barrel-chair", "Swivel Barrel Chair", "Bouclé, steel base", 112000),
  item("seating", "upholstered-ottoman", "Upholstered Ottoman", "Linen, beech", 38000),

  item("tables", "oak-coffee-table", "Oak Coffee Table", "Solid oak", 96000),
  item("tables", "marble-side-table", "Marble Side Table", "Marble, brass", 54000, "New"),
  item("tables", "walnut-console-table", "Walnut Console Table", "Walnut veneer", 128000),
  item("tables", "nesting-table-set", "Nesting Table Set", "Ash, powder-coated steel", 72000),

  item("storage", "walnut-sideboard", "Walnut Sideboard", "Walnut veneer", 189000, "Best seller"),
  item("storage", "fluted-oak-cabinet", "Fluted Oak Cabinet", "Oak, fluted doors", 164000),
  item("storage", "open-bookshelf", "Open Bookshelf", "Ash, steel frame", 92000),
  item("storage", "entryway-shoe-bench", "Entryway Shoe Bench", "Oak, cane", 48000),

  item("lighting", "linen-table-lamp", "Linen Table Lamp", "Ceramic base, linen shade", 28000),
  item("lighting", "ceramic-pendant-light", "Ceramic Pendant Light", "Glazed ceramic", 36000, "New"),
  item("lighting", "rattan-wall-sconce", "Rattan Wall Sconce", "Rattan, brass", 22000),
  item("lighting", "brass-arc-lamp-small", "Brass Desk Lamp", "Brass", 19500),
];

// Price format: server aur browser dono par same rahe, is liye Intl ki jagah simple format
export const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

export const getCategoryLabel = (key: CategoryKey) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key;

// Usi category ke baaki products; kam hon to doosri categories se bhar do
export const getRelated = (product: Product, limit = 4): Product[] => {
  const same = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id);
  const others = PRODUCTS.filter((p) => p.category !== product.category);
  return [...same, ...others].slice(0, limit);
};