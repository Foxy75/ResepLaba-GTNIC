import type { Batch, InventoryItem, Product, Transaction } from "./types";

export const DEMO_TODAY = "2026-10-25";

export function addDays(day: string, offset: number): string {
  const base = Date.parse(`${day}T00:00:00Z`);
  return new Date(base + offset * 86400000).toISOString().slice(0, 10);
}

export function daysLeft(day: string, today: string = DEMO_TODAY): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  );
}

export type ExpiryState = "expired" | "critical" | "warning" | "healthy";

export function expiryState(days: number): ExpiryState {
  if (days < 0) return "expired";
  if (days <= 1) return "critical";
  if (days <= 3) return "warning";
  return "healthy";
}

export function expiryLabel(days: number): string {
  if (days < 0) return "Kedaluwarsa";
  if (days === 0) return "Kritis · hari ini";
  if (days === 1) return "Kritis · H-1";
  if (days <= 3) return `Segera · H-${days}`;
  return "Aman";
}

export function isUsableBatch(batch: Batch, today: string = DEMO_TODAY): boolean {
  return batch.status === "ACTIVE" && batch.qty > 0 && batch.expiresAt >= today;
}

export function sortBatchesFefo(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiresAt !== b.expiresAt) return a.expiresAt.localeCompare(b.expiresAt);
    return a.code.localeCompare(b.code);
  });
}

export function stockOf(itemId: string, batches: Batch[], today: string = DEMO_TODAY): number {
  return batches
    .filter((batch) => batch.itemId === itemId && isUsableBatch(batch, today))
    .reduce((sum, batch) => sum + batch.qty, 0);
}

export type FefoTake = { batchId: string; qty: number; unitCost: number };

export type FefoResult = {
  batches: Batch[];
  taken: FefoTake[];
  hpp: number;
  shortage: number;
};

export function deductFefo(
  batches: Batch[],
  itemId: string,
  needed: number,
  today: string = DEMO_TODAY,
): FefoResult {
  const next = batches.map((batch) => ({ ...batch }));
  const candidates = sortBatchesFefo(next.filter((batch) => isUsableBatch(batch, today) && batch.itemId === itemId));
  const taken: FefoTake[] = [];
  let remaining = needed;
  let hpp = 0;

  for (const batch of candidates) {
    if (remaining <= 0) break;
    const used = Math.min(batch.qty, remaining);
    batch.qty = Math.round((batch.qty - used) * 1000) / 1000;
    batch.status = batch.qty <= 0 ? "DEPLETED" : "ACTIVE";
    remaining -= used;
    hpp += used * batch.unitCost;
    taken.push({ batchId: batch.id, qty: used, unitCost: batch.unitCost });
  }

  return { batches: next, taken, hpp: Math.round(hpp), shortage: Math.max(0, remaining) };
}

export function movingAverageCost(
  currentQty: number,
  currentCost: number,
  addQty: number,
  addCost: number,
): number {
  if (currentQty <= 0) return addCost;
  const total = currentQty + addQty;
  if (total <= 0) return currentCost;
  return (currentQty * currentCost + addQty * addCost) / total;
}

export function computeHpp(product: Product, items: InventoryItem[]): number {
  const total = product.recipe.reduce((sum, line) => {
    const item = items.find((entry) => entry.id === line.itemId);
    if (!item) return sum;
    const wasteFactor = 1 + (line.wastePct || 0) / 100;
    return sum + line.qty * wasteFactor * item.unitCost;
  }, 0);
  return Math.round(total);
}

export function marginPercent(price: number, hpp: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - hpp) / price) * 1000) / 10;
}

export function recommendedPrice(hpp: number, targetMargin: number): number {
  const ratio = Math.min(Math.max(targetMargin, 0), 90) / 100;
  const raw = hpp / (1 - ratio);
  return Math.ceil(raw / 500) * 500;
}

export type MarginState = "safe" | "thin" | "critical";

export function marginState(margin: number, target: number): MarginState {
  if (margin >= target) return "safe";
  if (margin >= target - 10) return "thin";
  return "critical";
}

export function marginStateLabel(state: MarginState, margin: number): string {
  if (state === "safe") return `Margin ${margin}%, aman.`;
  if (state === "thin") return `Margin ${margin}%, mulai tipis.`;
  return `Margin ${margin}%, untung hampir habis.`;
}

export function portionsAvailable(
  product: Product,
  items: InventoryItem[],
  batches: Batch[],
  today: string = DEMO_TODAY,
): number {
  if (!product.recipe.length) return 0;
  return product.recipe.reduce((limit, line) => {
    const item = items.find((entry) => entry.id === line.itemId);
    if (!item) return 0;
    const wasteFactor = 1 + (line.wastePct || 0) / 100;
    const perPortion = line.qty * wasteFactor;
    if (perPortion <= 0) return limit;
    return Math.min(limit, Math.floor(stockOf(line.itemId, batches, today) / perPortion));
  }, Number.POSITIVE_INFINITY);
}

export type ProfitPoint = { day: string; omzet: number; hpp: number; laba: number };

export function seriesByDay(
  transactions: Transaction[],
  days: number,
  today: string = DEMO_TODAY,
): ProfitPoint[] {
  const points: ProfitPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    const dayTransactions = transactions.filter((transaction) => transaction.day === day);
    const omzet = dayTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const hpp = dayTransactions.reduce((sum, transaction) => sum + transaction.hpp, 0);
    points.push({ day, omzet, hpp, laba: omzet - hpp });
  }
  return points;
}

export type ProductProfit = {
  productId: string;
  name: string;
  qty: number;
  omzet: number;
  hpp: number;
  laba: number;
};

export function profitByProduct(transactions: Transaction[]): ProductProfit[] {
  const map = new Map<string, ProductProfit>();
  for (const transaction of transactions) {
    for (const line of transaction.lines) {
      const entry = map.get(line.productId) ?? {
        productId: line.productId,
        name: line.name,
        qty: 0,
        omzet: 0,
        hpp: 0,
        laba: 0,
      };
      entry.qty += line.qty;
      entry.omzet += line.price * line.qty;
      entry.hpp += line.hpp * line.qty;
      entry.laba = entry.omzet - entry.hpp;
      map.set(line.productId, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.laba - a.laba);
}

export type LowStockEntry = { item: InventoryItem; stock: number; minStock: number };

export function lowStockItems(
  items: InventoryItem[],
  batches: Batch[],
  today: string = DEMO_TODAY,
): LowStockEntry[] {
  return items
    .map((item) => ({ item, stock: stockOf(item.id, batches, today), minStock: item.minStock }))
    .filter((entry) => entry.stock < entry.minStock)
    .sort((a, b) => a.stock - b.stock);
}

export type ExpiryCell = { itemId: string; itemName: string; unit: string; counts: number[] };

export function expiryHeatmap(
  items: InventoryItem[],
  batches: Batch[],
  days: number,
  today: string = DEMO_TODAY,
): ExpiryCell[] {
  return items.map((item) => {
    const counts = Array.from({ length: days }, (_, index) => {
      const day = addDays(today, index);
      return batches.filter((batch) => batch.itemId === item.id && batch.expiresAt === day).length;
    });
    return { itemId: item.id, itemName: item.name, unit: item.baseUnit, counts };
  });
}

export function stockOrderText(
  store: { name: string },
  entries: LowStockEntry[],
  batches: Batch[],
  today: string = DEMO_TODAY,
): string {
  const lines = entries.map((entry) => {
    const urgent = sortBatchesFefo(
      batches.filter((batch) => batch.itemId === entry.item.id && isUsableBatch(batch, today)),
    )[0];
    const expiry = urgent ? ` (batch ${urgent.code}, exp ${urgent.expiresAt})` : "";
    return `- ${entry.item.name}: sisa ${entry.stock} ${entry.item.baseUnit}, minimal ${entry.minStock}. Minta ${entry.item.purchaseUnit}${expiry}`;
  });
  return [
    `Halo Agen, saya pesan kulakan untuk ${store.name}.`,
    "",
    ...lines,
    "",
    "Mohon info harga terbaru dan tanggal kedaluwarsa. Terima kasih.",
  ].join("\n");
}

export function promoText(itemName: string, batchCode: string, days: number, qty: number): string {
  return [
    `PROMO TEBUS MURAH ${itemName.toUpperCase()}`,
    `Batch ${batchCode}, sisa ${qty},expires dalam ${days} hari.`,
    "",
    ` Promo hari ini: ${itemName} diskon 20%. Stok terbatas, crescendo saja.`,
    `Bisa tune/titip ke etalase depan ya, biar laku sebelum basi.`,
  ].join("\n");
}
