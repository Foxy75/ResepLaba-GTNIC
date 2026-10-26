import { addDays, computeHpp, DEMO_TODAY } from "./domain";
import type {
  Batch,
  Broadcast,
  InventoryItem,
  Product,
  Profile,
  Store,
  Tenant,
  Template,
  Transaction,
  Workspace,
} from "./types";

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const warmindoStore: Store = {
  id: "store-warmindo",
  name: "Warmindo Cak Budi",
  ownerName: "Budi Santoso",
  businessType: "WARMINDO",
  categoryLabel: "Warmindo",
  whatsapp: "6281234567890",
  status: "ACTIVE",
  aiQuota: 5,
  aiUsed: 2,
  targetMargin: 25,
  pin: "1234",
};

const maduraStore: Store = {
  id: "store-madura",
  name: "Warung Madura Berkah",
  ownerName: "Siti Aminah",
  businessType: "MADURA",
  categoryLabel: "Warung kelontong",
  whatsapp: "6289876543210",
  status: "ACTIVE",
  aiQuota: 5,
  aiUsed: 1,
  targetMargin: 20,
  pin: "1234",
};

const warmindoItems: InventoryItem[] = [
  { id: "noodle", name: "Mie instan goreng", baseUnit: "bungkus", purchaseUnit: "dus", conversionRate: 40, unitCost: 2800, minStock: 8 },
  { id: "egg", name: "Telur ayam", baseUnit: "butir", purchaseUnit: "krat", conversionRate: 240, unitCost: 2100, minStock: 24 },
  { id: "rice", name: "Beras", baseUnit: "gram", purchaseUnit: "karung 25 kg", conversionRate: 25000, unitCost: 14, minStock: 3000 },
  { id: "milk", name: "Susu kotak cokelat", baseUnit: "kotak", purchaseUnit: "dus", conversionRate: 24, unitCost: 3800, minStock: 6 },
  { id: "bread", name: "Roti tawar", baseUnit: "bungkus", purchaseUnit: "pak", conversionRate: 12, unitCost: 11000, minStock: 4 },
  { id: "tea", name: "Teh sachet", baseUnit: "sachet", purchaseUnit: "renceng", conversionRate: 10, unitCost: 350, minStock: 10 },
  { id: "sugar", name: "Gula pasir", baseUnit: "gram", purchaseUnit: "sak 1 kg", conversionRate: 1000, unitCost: 16, minStock: 200 },
  { id: "coffee", name: "Kopi sachet", baseUnit: "sachet", purchaseUnit: "renceng", conversionRate: 10, unitCost: 1200, minStock: 6 },
];

const maduraItems: InventoryItem[] = [
  { id: "m-indomie", name: "Indomie goreng", baseUnit: "bungkus", purchaseUnit: "dus", conversionRate: 40, unitCost: 2800, minStock: 8 },
  { id: "m-telur", name: "Telur ayam", baseUnit: "butir", purchaseUnit: "krat", conversionRate: 240, unitCost: 2000, minStock: 24 },
  { id: "m-kopi", name: "Kopi sachet", baseUnit: "sachet", purchaseUnit: "renceng", conversionRate: 10, unitCost: 1300, minStock: 8 },
  { id: "m-susu", name: "Susu UHT 1 liter", baseUnit: "kotak", purchaseUnit: "dus", conversionRate: 24, unitCost: 4200, minStock: 6 },
  { id: "m-roti", name: "Roti tawar", baseUnit: "bungkus", purchaseUnit: "pak", conversionRate: 12, unitCost: 12000, minStock: 4 },
  { id: "m-air", name: "Air mineral", baseUnit: "botol", purchaseUnit: "dus", conversionRate: 24, unitCost: 2500, minStock: 6 },
];

function warmindoBatches(): Batch[] {
  return [
    { id: "b-n-1", itemId: "noodle", code: "M-2609-A", expiresAt: addDays(DEMO_TODAY, 120), qty: 23, initialQty: 40, unitCost: 2800, status: "ACTIVE" },
    { id: "b-n-2", itemId: "noodle", code: "M-2701-B", expiresAt: addDays(DEMO_TODAY, 210), qty: 40, initialQty: 40, unitCost: 2800, status: "ACTIVE" },
    { id: "b-e-1", itemId: "egg", code: "T-2610-A", expiresAt: addDays(DEMO_TODAY, 8), qty: 96, initialQty: 120, unitCost: 2100, status: "ACTIVE" },
    { id: "b-e-2", itemId: "egg", code: "T-2611-B", expiresAt: addDays(DEMO_TODAY, 15), qty: 144, initialQty: 240, unitCost: 2100, status: "ACTIVE" },
    { id: "b-r-1", itemId: "rice", code: "B-2612-A", expiresAt: addDays(DEMO_TODAY, 300), qty: 18500, initialQty: 25000, unitCost: 14, status: "ACTIVE" },
    { id: "b-m-1", itemId: "milk", code: "S-2609-A", expiresAt: addDays(DEMO_TODAY, 1), qty: 4, initialQty: 12, unitCost: 3800, status: "ACTIVE" },
    { id: "b-m-2", itemId: "milk", code: "S-2611-B", expiresAt: addDays(DEMO_TODAY, 90), qty: 20, initialQty: 24, unitCost: 3800, status: "ACTIVE" },
    { id: "b-b-1", itemId: "bread", code: "R-2610-A", expiresAt: addDays(DEMO_TODAY, 3), qty: 6, initialQty: 12, unitCost: 11000, status: "ACTIVE" },
    { id: "b-t-1", itemId: "tea", code: "TS-2609-A", expiresAt: addDays(DEMO_TODAY, 150), qty: 30, initialQty: 50, unitCost: 350, status: "ACTIVE" },
    { id: "b-s-1", itemId: "sugar", code: "G-2612-A", expiresAt: addDays(DEMO_TODAY, 220), qty: 800, initialQty: 1000, unitCost: 16, status: "ACTIVE" },
    { id: "b-k-1", itemId: "coffee", code: "K-2609-A", expiresAt: addDays(DEMO_TODAY, 120), qty: 22, initialQty: 30, unitCost: 1200, status: "ACTIVE" },
  ];
}

function maduraBatches(): Batch[] {
  return [
    { id: "b-mi-1", itemId: "m-indomie", code: "IM-2609-A", expiresAt: addDays(DEMO_TODAY, 110), qty: 18, initialQty: 40, unitCost: 2800, status: "ACTIVE" },
    { id: "b-mi-2", itemId: "m-indomie", code: "IM-2702-B", expiresAt: addDays(DEMO_TODAY, 240), qty: 40, initialQty: 40, unitCost: 2800, status: "ACTIVE" },
    { id: "b-mt-1", itemId: "m-telur", code: "MT-2610-A", expiresAt: addDays(DEMO_TODAY, 10), qty: 80, initialQty: 120, unitCost: 2000, status: "ACTIVE" },
    { id: "b-mt-2", itemId: "m-telur", code: "MT-2611-B", expiresAt: addDays(DEMO_TODAY, 20), qty: 120, initialQty: 240, unitCost: 2000, status: "ACTIVE" },
    { id: "b-mk-1", itemId: "m-kopi", code: "MK-2609-A", expiresAt: addDays(DEMO_TODAY, 140), qty: 26, initialQty: 40, unitCost: 1300, status: "ACTIVE" },
    { id: "b-ms-1", itemId: "m-susu", code: "MS-2609-A", expiresAt: addDays(DEMO_TODAY, 2), qty: 6, initialQty: 12, unitCost: 4200, status: "ACTIVE" },
    { id: "b-ms-2", itemId: "m-susu", code: "MS-2611-B", expiresAt: addDays(DEMO_TODAY, 95), qty: 18, initialQty: 24, unitCost: 4200, status: "ACTIVE" },
    { id: "b-mr-1", itemId: "m-roti", code: "MR-2610-A", expiresAt: addDays(DEMO_TODAY, 3), qty: 5, initialQty: 12, unitCost: 12000, status: "ACTIVE" },
    { id: "b-ma-1", itemId: "m-air", code: "MA-2609-A", expiresAt: addDays(DEMO_TODAY, 200), qty: 24, initialQty: 24, unitCost: 2500, status: "ACTIVE" },
  ];
}

const warmindoProducts: Product[] = [
  { id: "mie-telur", name: "Mie Goreng Telur + Nasi", kind: "recipe", category: "makanan", icon: "meal", price: 15000, targetMargin: 30, recipe: [{ itemId: "noodle", qty: 1, wastePct: 5 }, { itemId: "egg", qty: 1, wastePct: 0 }, { itemId: "rice", qty: 150, wastePct: 2 }] },
  { id: "telur-dadar", name: "Telur Dadar", kind: "recipe", category: "makanan", icon: "egg", price: 7000, targetMargin: 28, recipe: [{ itemId: "egg", qty: 2, wastePct: 3 }] },
  { id: "nasi", name: "Nasi Putih", kind: "recipe", category: "makanan", icon: "rice", price: 5000, targetMargin: 30, recipe: [{ itemId: "rice", qty: 180, wastePct: 2 }] },
  { id: "indomie-rebus", name: "Indomie Rebus", kind: "recipe", category: "makanan", icon: "soup", price: 10000, targetMargin: 30, recipe: [{ itemId: "noodle", qty: 1, wastePct: 5 }, { itemId: "egg", qty: 1, wastePct: 0 }] },
  { id: "es-teh", name: "Es Teh Manis", kind: "recipe", category: "minuman", icon: "drink", price: 4000, targetMargin: 35, recipe: [{ itemId: "tea", qty: 2, wastePct: 0 }, { itemId: "sugar", qty: 20, wastePct: 0 }] },
  { id: "kopi-susu", name: "Kopi Susu Sachet", kind: "recipe", category: "minuman", icon: "coffee", price: 5000, targetMargin: 32, recipe: [{ itemId: "coffee", qty: 1, wastePct: 0 }, { itemId: "milk", qty: 1, wastePct: 0 }, { itemId: "sugar", qty: 10, wastePct: 0 }] },
  { id: "indomie-ecer", name: "Indomie Goreng Bungkus", kind: "retail", category: "eceran", icon: "pack", price: 3500, targetMargin: 18, recipe: [{ itemId: "noodle", qty: 1, wastePct: 0 }] },
  { id: "telur-rebus", name: "Telur Rebus", kind: "retail", category: "eceran", icon: "egg", price: 3000, targetMargin: 18, recipe: [{ itemId: "egg", qty: 1, wastePct: 0 }] },
];

const maduraProducts: Product[] = [
  { id: "md-indomie", name: "Indomie Goreng", kind: "retail", category: "eceran", icon: "pack", price: 3500, targetMargin: 18, recipe: [{ itemId: "m-indomie", qty: 1, wastePct: 0 }] },
  { id: "md-telur-rebus", name: "Telur Rebus", kind: "retail", category: "eceran", icon: "egg", price: 3000, targetMargin: 18, recipe: [{ itemId: "m-telur", qty: 1, wastePct: 0 }] },
  { id: "md-kopi", name: "Kopi Sachet", kind: "retail", category: "minuman", icon: "coffee", price: 1500, targetMargin: 20, recipe: [{ itemId: "m-kopi", qty: 1, wastePct: 0 }] },
  { id: "md-susu", name: "Susu Kotak", kind: "retail", category: "minuman", icon: "drink", price: 4500, targetMargin: 20, recipe: [{ itemId: "m-susu", qty: 1, wastePct: 0 }] },
  { id: "md-roti", name: "Roti Tawar", kind: "retail", category: "eceran", icon: "pack", price: 13000, targetMargin: 22, recipe: [{ itemId: "m-roti", qty: 1, wastePct: 0 }] },
  { id: "md-air", name: "Air Mineral", kind: "retail", category: "eceran", icon: "pack", price: 3000, targetMargin: 18, recipe: [{ itemId: "m-air", qty: 1, wastePct: 0 }] },
  { id: "md-kuah", name: "Indomie Kuah Telur", kind: "recipe", category: "makanan", icon: "soup", price: 9000, targetMargin: 28, recipe: [{ itemId: "m-indomie", qty: 1, wastePct: 5 }, { itemId: "m-telur", qty: 1, wastePct: 0 }] },
];

function buildTransactions(
  storeId: string,
  products: Product[],
  items: InventoryItem[],
  targets: number[],
  seed: number,
): Transaction[] {
  const rng = makeRng(seed);
  const transactions: Transaction[] = [];
  let counter = 1;

  for (let offset = 0; offset < targets.length; offset += 1) {
    const day = addDays(DEMO_TODAY, -offset);
    let total = 0;
    while (total < targets[offset]) {
      const lineCount = 1 + Math.floor(rng() * 3);
      const lines = Array.from({ length: lineCount }, () => {
        const product = products[Math.floor(rng() * products.length)];
        const qty = 1 + Math.floor(rng() * 3);
        return {
          productId: product.id,
          name: product.name,
          qty,
          price: product.price,
          hpp: computeHpp(product, items),
        };
      });
      const lineTotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
      const hpp = lines.reduce((sum, line) => sum + line.hpp * line.qty, 0);
      const hour = String(2 + Math.floor(rng() * 15)).padStart(2, "0");
      const minute = String(Math.floor(rng() * 60)).padStart(2, "0");
      transactions.push({
        id: `RL-${day.replace(/-/g, "")}-${String(counter).padStart(3, "0")}`,
        storeId,
        createdAt: `${day}T${hour}:${minute}:00.000Z`,
        day,
        total: lineTotal,
        hpp,
        profit: lineTotal - hpp,
        lines,
      });
      total += lineTotal;
      counter += 1;
    }
  }

  return transactions;
}

const warmindoTransactions = () =>
  buildTransactions(
    "store-warmindo",
    warmindoProducts,
    warmindoItems,
    [845000, 1390000, 1210000, 1600000, 1450000, 990000, 1320000],
    20261025,
  );

const maduraTransactions = () =>
  buildTransactions(
    "store-madura",
    maduraProducts,
    maduraItems,
    [612000, 980000, 845000, 1210000, 760000, 690000, 1020000],
    20261026,
  );

export function buildWorkspace(profile: Profile): Workspace {
  if (profile === "madura") {
    return {
      store: maduraStore,
      items: maduraItems.map((item) => ({ ...item })),
      batches: maduraBatches(),
      products: maduraProducts.map((product) => ({ ...product, recipe: product.recipe.map((line) => ({ ...line })) })),
      transactions: maduraTransactions(),
    };
  }
  return {
    store: warmindoStore,
    items: warmindoItems.map((item) => ({ ...item })),
    batches: warmindoBatches(),
    products: warmindoProducts.map((product) => ({ ...product, recipe: product.recipe.map((line) => ({ ...line })) })),
    transactions: warmindoTransactions(),
  };
}

export function seedTenants(): Tenant[] {
  return [
    { id: "t-1", storeId: "store-warmindo", name: "Warmindo Cak Budi", ownerName: "Budi Santoso", businessType: "WARMINDO", categoryLabel: "Warmindo", status: "ACTIVE", transactionsToday: 18, aiUsed: 2, aiQuota: 5, joinedAt: "2026-08-12" },
    { id: "t-2", storeId: "store-madura", name: "Warung Madura Berkah", ownerName: "Siti Aminah", businessType: "MADURA", categoryLabel: "Warung kelontong", status: "ACTIVE", transactionsToday: 26, aiUsed: 1, aiQuota: 5, joinedAt: "2026-07-30" },
    { id: "t-3", storeId: "store-3", name: "Roti Pagi Bu Rina", ownerName: "Rina Wijaya", businessType: "BAKERY", categoryLabel: "Toko roti", status: "ACTIVE", transactionsToday: 12, aiUsed: 4, aiQuota: 5, joinedAt: "2026-09-05" },
    { id: "t-4", storeId: "store-4", name: "Warkop Sore Abadi", ownerName: "Pak Hadi", businessType: "OTHER", categoryLabel: "Warkop", status: "ACTIVE", transactionsToday: 9, aiUsed: 0, aiQuota: 5, joinedAt: "2026-10-02" },
    { id: "t-5", storeId: "store-5", name: "Warung kecil Mbak Nani", ownerName: "Nani", businessType: "MADURA", categoryLabel: "Warung kelontong", status: "SUSPENDED", transactionsToday: 0, aiUsed: 5, aiQuota: 5, joinedAt: "2026-06-18" },
  ];
}

export function seedBroadcasts(): Broadcast[] {
  return [
    {
      id: "bc-1",
      message: "Harga telur di pasar naik 25% minggu ini. Cek harga menu yang pakai telur sebelum jualan berikutnya.",
      severity: "warning",
      createdAt: `${addDays(DEMO_TODAY, -1)}T03:00:00.000Z`,
    },
  ];
}

export function seedTemplates(): Template[] {
  return [
    {
      id: "tmpl-madura",
      name: "Warung Madura",
      description: "Barang eceran kelontong: mie, telur, kopi, susu, roti, air.",
      items: [
        { name: "Indomie goreng", baseUnit: "bungkus", purchaseUnit: "dus", conversionRate: 40, unitCost: 2800, minStock: 8 },
        { name: "Telur ayam", baseUnit: "butir", purchaseUnit: "krat", conversionRate: 240, unitCost: 2000, minStock: 24 },
        { name: "Kopi sachet", baseUnit: "sachet", purchaseUnit: "renceng", conversionRate: 10, unitCost: 1300, minStock: 8 },
        { name: "Susu UHT 1 liter", baseUnit: "kotak", purchaseUnit: "dus", conversionRate: 24, unitCost: 4200, minStock: 6 },
      ],
    },
    {
      id: "tmpl-warmindo",
      name: "Warmindo",
      description: "Bahan dasar racikan mie goreng, nasi, es teh, dan kopi susu.",
      items: [
        { name: "Mie instan goreng", baseUnit: "bungkus", purchaseUnit: "dus", conversionRate: 40, unitCost: 2800, minStock: 8 },
        { name: "Telur ayam", baseUnit: "butir", purchaseUnit: "krat", conversionRate: 240, unitCost: 2100, minStock: 24 },
        { name: "Beras", baseUnit: "gram", purchaseUnit: "karung 25 kg", conversionRate: 25000, unitCost: 14, minStock: 3000 },
        { name: "Teh sachet", baseUnit: "sachet", purchaseUnit: "renceng", conversionRate: 10, unitCost: 350, minStock: 10 },
      ],
    },
    {
      id: "tmpl-roti",
      name: "Toko roti",
      description: "Tepung, margarine, Yeast, gula, dan kemasan.",
      items: [
        { name: "Tepung terigu", baseUnit: "gram", purchaseUnit: "sak 25 kg", conversionRate: 25000, unitCost: 12, minStock: 5000 },
        { name: "Margarine", baseUnit: "gram", purchaseUnit: "sak 2 kg", conversionRate: 2000, unitCost: 48, minStock: 500 },
        { name: "Gula pasir", baseUnit: "gram", purchaseUnit: "sak 1 kg", conversionRate: 1000, unitCost: 16, minStock: 200 },
      ],
    },
    {
      id: "tmpl-warkop",
      name: "Warkop",
      description: "Kopi bubuk, gula, susu, teh, dan snack.",
      items: [
        { name: "Kopi bubuk", baseUnit: "gram", purchaseUnit: "renteng 10 sachet", conversionRate: 200, unitCost: 90, minStock: 100 },
        { name: "Gula pasir", baseUnit: "gram", purchaseUnit: "sak 1 kg", conversionRate: 1000, unitCost: 16, minStock: 200 },
        { name: "Susu kental manis", baseUnit: "ml", purchaseUnit: "kaleng 600 ml", conversionRate: 600, unitCost: 24, minStock: 120 },
      ],
    },
  ];
}
