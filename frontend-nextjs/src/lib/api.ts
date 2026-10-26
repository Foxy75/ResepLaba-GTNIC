import {
  addDays,
  computeHpp,
  deductFefo,
  DEMO_TODAY,
  movingAverageCost,
  portionsAvailable,
  stockOf,
} from "./domain";
import { buildWorkspace, seedBroadcasts, seedTemplates, seedTenants } from "./seed";
import type {
  ApiResult,
  Batch,
  Broadcast,
  CheckoutInput,
  CheckoutOutput,
  InventoryItem,
  Product,
  Profile,
  ReceiptDraft,
  ReceiptDraftRow,
  RestockInput,
  Snapshot,
  StoreStatus,
  Tenant,
  Template,
  Transaction,
} from "./types";

type Database = {
  workspace: ReturnType<typeof buildWorkspace>;
  tenants: Tenant[];
  broadcasts: Broadcast[];
  templates: Template[];
  sequence: number;
};

const db: Database = {
  workspace: buildWorkspace("warmindo"),
  tenants: seedTenants(),
  broadcasts: seedBroadcasts(),
  templates: seedTemplates(),
  sequence: 900,
};

function nextId(prefix: string): string {
  db.sequence += 1;
  return `${prefix}-${db.sequence}`;
}

function ok<T>(message: string, data: T, warnings: string[] = []): ApiResult<T> {
  return { success: true, message, data, warnings };
}

function fail<T>(message: string, warnings: string[] = []): ApiResult<T> {
  return { success: false, message, data: null, warnings };
}

export function currentSnapshot(): Snapshot {
  return {
    store: db.workspace.store,
    items: db.workspace.items,
    batches: db.workspace.batches,
    products: db.workspace.products,
    transactions: db.workspace.transactions,
    broadcasts: db.broadcasts,
    tenants: db.tenants,
    templates: db.templates,
  };
}

function marginWarnings(): string[] {
  const warnings: string[] = [];
  for (const product of db.workspace.products) {
    const hpp = computeHpp(product, db.workspace.items);
    const margin = product.price > 0 ? ((product.price - hpp) / product.price) * 100 : 0;
    if (margin < product.targetMargin) {
      warnings.push(`Margin ${product.name} turun ke ${margin.toFixed(1)}%.`);
    }
  }
  return warnings;
}

function receiptDraft(): ReceiptDraft {
  return {
    supplier: "Agen Sumber Rezeki",
    receiptDate: DEMO_TODAY,
    rows: [
      { itemId: "egg", name: "Telur ayam", purchaseQty: 1, purchaseUnit: "krat", conversionRate: 240, totalCost: 552000, expiresAt: addDays(DEMO_TODAY, 21) },
      { itemId: "noodle", name: "Mie instan goreng", purchaseQty: 2, purchaseUnit: "dus", conversionRate: 40, totalCost: 236000, expiresAt: addDays(DEMO_TODAY, 150) },
    ],
  };
}

export const api = {
  async selectProfile(profile: Profile): Promise<ApiResult<Snapshot>> {
    if (profile === "admin") {
      return ok("Panel platform siap.", currentSnapshot());
    }
    db.workspace = buildWorkspace(profile);
    return ok("Data contoh dimuat.", currentSnapshot());
  },

  async checkout(lines: CheckoutInput): Promise<ApiResult<CheckoutOutput>> {
    const usable = lines.filter((line) => line.qty > 0);
    if (!usable.length) return fail<CheckoutOutput>("Keranjang masih kosong.");

    let batches = db.workspace.batches.map((batch) => ({ ...batch }));
    const transactionLines = [];
    let total = 0;
    let hpp = 0;

    for (const line of usable) {
      const product = db.workspace.products.find((entry) => entry.id === line.productId);
      if (!product) return fail<CheckoutOutput>("Menu tidak ditemukan. Muat ulang halaman.");

      for (const ingredient of product.recipe) {
        const item = db.workspace.items.find((entry) => entry.id === ingredient.itemId);
        if (!item) return fail<CheckoutOutput>("Bahan utama belum terdaftar.");
        const wasteFactor = 1 + (ingredient.wastePct || 0) / 100;
        const needed = ingredient.qty * wasteFactor * line.qty;
        const available = batches
          .filter(
            (batch) =>
              batch.itemId === ingredient.itemId &&
              batch.status === "ACTIVE" &&
              batch.qty > 0 &&
              batch.expiresAt >= DEMO_TODAY,
          )
          .reduce((sum, batch) => sum + batch.qty, 0);
        if (available < needed) {
          return fail<CheckoutOutput>(`Stok ${item.name} tidak cukup untuk transaksi ini.`);
        }
        const result = deductFefo(batches, ingredient.itemId, needed);
        batches = result.batches;
        hpp += result.hpp;
      }

      const unitHpp = computeHpp(product, db.workspace.items);
      transactionLines.push({
        productId: product.id,
        name: product.name,
        qty: line.qty,
        price: product.price,
        hpp: unitHpp,
      });
      total += product.price * line.qty;
    }

    const createdAt = `${DEMO_TODAY}T${String(6 + (db.sequence % 8)).padStart(2, "0")}:${String(db.sequence % 60).padStart(2, "0")}:00.000Z`;
    const transaction: Transaction = {
      id: nextId("RL"),
      storeId: db.workspace.store.id,
      createdAt,
      day: DEMO_TODAY,
      total,
      hpp: Math.round(hpp),
      profit: total - Math.round(hpp),
      lines: transactionLines,
    };

    db.workspace = { ...db.workspace, batches, transactions: [transaction, ...db.workspace.transactions] };

    const portions = db.workspace.products.map((product) => ({
      productId: product.id,
      portions: portionsAvailable(product, db.workspace.items, batches),
    }));

    return ok("Transaksi tersimpan.", { transaction, portions });
  },

  async restock(input: RestockInput): Promise<ApiResult<{ batch: Batch; units: number; unitCost: number }>> {
    const item = db.workspace.items.find((entry) => entry.id === input.itemId);
    if (!item) return fail("Pilih barang yang tersedia.");
    if (!(input.purchaseQty > 0)) return fail("Jumlah kemasan harus lebih dari nol.");
    if (!(input.totalCost > 0)) return fail("Total harga harus lebih dari nol.");
    if (!input.expiresAt) return fail("Tanggal kedaluwarsa wajib diisi.");
    if (input.expiresAt < DEMO_TODAY) return fail("Tanggal kedaluwarsa tidak boleh di masa lalu.");

    const units = input.purchaseQty * item.conversionRate;
    const unitCost = input.totalCost / units;
    const currentQty = stockOf(item.id, db.workspace.batches);
    const nextCost = movingAverageCost(currentQty, item.unitCost, units, unitCost);

    const batch: Batch = {
      id: nextId("batch"),
      itemId: item.id,
      code: input.code.trim() || `${item.baseUnit.slice(0, 2).toUpperCase()}-${DEMO_TODAY.slice(2).replace(/-/g, "")}`,
      expiresAt: input.expiresAt,
      qty: units,
      initialQty: units,
      unitCost,
      status: "ACTIVE",
    };

    db.workspace = {
      ...db.workspace,
      batches: [...db.workspace.batches, batch],
      items: db.workspace.items.map((entry) =>
        entry.id === item.id ? { ...entry, unitCost: nextCost } : entry,
      ),
    };

    return ok("Kulakan tersimpan.", { batch, units, unitCost }, marginWarnings());
  },

  async scanReceipt(): Promise<ApiResult<ReceiptDraft>> {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return ok("Draf nota siap diperiksa.", receiptDraft());
  },

  async saveReceiptDraft(rows: ReceiptDraftRow[]): Promise<ApiResult<{ added: number }>> {
    let added = 0;
    const warnings: string[] = [];

    for (const row of rows) {
      const item = db.workspace.items.find((entry) => entry.id === row.itemId);
      if (!item) {
        warnings.push(`${row.name} belum ada di daftar barang.`);
        continue;
      }
      if (!row.expiresAt) {
        warnings.push(`${row.name} belum punya tanggal kedaluwarsa.`);
        continue;
      }
      const units = row.purchaseQty * item.conversionRate;
      const unitCost = row.totalCost / units;
      const currentQty = stockOf(item.id, db.workspace.batches);
      const nextCost = movingAverageCost(currentQty, item.unitCost, units, unitCost);
      const batch: Batch = {
        id: nextId("batch"),
        itemId: item.id,
        code: `${item.baseUnit.slice(0, 2).toUpperCase()}-${DEMO_TODAY.slice(2).replace(/-/g, "")}`,
        expiresAt: row.expiresAt,
        qty: units,
        initialQty: units,
        unitCost,
        status: "ACTIVE",
      };
      db.workspace = {
        ...db.workspace,
        batches: [...db.workspace.batches, batch],
        items: db.workspace.items.map((entry) =>
          entry.id === item.id ? { ...entry, unitCost: nextCost } : entry,
        ),
      };
      added += 1;
    }

    if (!added) return fail("Belum ada baris yang bisa disimpan. Isi tanggal kedaluwarsa lebih dulu.", warnings);
    return ok(`${added} barang masuk ke stok.`, { added }, [...warnings, ...marginWarnings()]);
  },

  async adjustBatch(batchId: string, qty: number, reason: string): Promise<ApiResult<Batch>> {
    const batch = db.workspace.batches.find((entry) => entry.id === batchId);
    if (!batch) return fail("Batch tidak ditemukan.");
    if (!(qty >= 0)) return fail("Jumlah hasil opname tidak boleh negatif.");
    db.workspace = {
      ...db.workspace,
      batches: db.workspace.batches.map((entry) =>
        entry.id === batchId
          ? { ...entry, qty, status: qty <= 0 ? "DEPLETED" : entry.status }
          : entry,
      ),
    };
    const updated = db.workspace.batches.find((entry) => entry.id === batchId) as Batch;
    return ok(`Stok ${batch.code} disesuaikan. ${reason}`.trim(), updated);
  },

  async markBatch(batchId: string, status: "DAMAGED" | "EXPIRED"): Promise<ApiResult<Batch>> {
    const batch = db.workspace.batches.find((entry) => entry.id === batchId);
    if (!batch) return fail("Batch tidak ditemukan.");
    db.workspace = {
      ...db.workspace,
      batches: db.workspace.batches.map((entry) =>
        entry.id === batchId ? { ...entry, status, qty: 0 } : entry,
      ),
    };
    const updated = db.workspace.batches.find((entry) => entry.id === batchId) as Batch;
    return ok(
      status === "DAMAGED" ? `Batch ${batch.code} ditandai rusak.` : `Batch ${batch.code} ditandai kedaluwarsa.`,
      updated,
    );
  },

  async removeBatch(batchId: string): Promise<ApiResult<null>> {
    const batch = db.workspace.batches.find((entry) => entry.id === batchId);
    if (!batch) return fail("Batch tidak ditemukan.");
    db.workspace = {
      ...db.workspace,
      batches: db.workspace.batches.filter((entry) => entry.id !== batchId),
    };
    return ok(`Batch ${batch.code} dihapus dari daftar stok.`, null);
  },

  async saveProduct(product: Product): Promise<ApiResult<Product>> {
    const exists = db.workspace.products.some((entry) => entry.id === product.id);
    if (!product.name.trim()) return fail("Nama menu belum diisi.");
    if (!product.recipe.length) return fail("Racikan minimal punya satu bahan.");
    if (product.price <= 0) return fail("Harga jual harus lebih dari nol.");
    db.workspace = {
      ...db.workspace,
      products: exists
        ? db.workspace.products.map((entry) => (entry.id === product.id ? { ...product } : entry))
        : [...db.workspace.products, { ...product }],
    };
    return ok(exists ? "Menu diperbarui." : "Menu baru disimpan.", { ...product });
  },

  async deleteProduct(productId: string): Promise<ApiResult<null>> {
    const product = db.workspace.products.find((entry) => entry.id === productId);
    if (!product) return fail("Menu tidak ditemukan.");
    db.workspace = {
      ...db.workspace,
      products: db.workspace.products.filter((entry) => entry.id !== productId),
    };
    return ok(`Menu ${product.name} dihapus.`, null);
  },

  async saveItem(item: InventoryItem): Promise<ApiResult<InventoryItem>> {
    const exists = db.workspace.items.some((entry) => entry.id === item.id);
    if (!item.name.trim()) return fail("Nama barang belum diisi.");
    if (!(item.conversionRate > 0)) return fail("Isi per kemasan harus lebih dari nol.");
    if (!(item.minStock >= 0)) return fail("Stok minimum tidak boleh negatif.");
    db.workspace = {
      ...db.workspace,
      items: exists
        ? db.workspace.items.map((entry) => (entry.id === item.id ? { ...item } : entry))
        : [...db.workspace.items, { ...item }],
    };
    return ok(exists ? "Barang diperbarui." : "Barang baru ditambahkan.", { ...item });
  },

  async verifyPin(pin: string): Promise<ApiResult<boolean>> {
    if (pin === db.workspace.store.pin) return ok("Mode Juragan terbuka.", true);
    return fail<boolean>("PIN salah. Coba lagi.");
  },

  async setTenantStatus(tenantId: string, status: StoreStatus): Promise<ApiResult<Tenant>> {
    const tenant = db.tenants.find((entry) => entry.id === tenantId);
    if (!tenant) return fail("Warung tidak ditemukan.");
    db.tenants = db.tenants.map((entry) => (entry.id === tenantId ? { ...entry, status } : entry));
    if (tenant.storeId === db.workspace.store.id) {
      db.workspace = {
        ...db.workspace,
        store: { ...db.workspace.store, status },
      };
    }
    const updated = db.tenants.find((entry) => entry.id === tenantId) as Tenant;
    return ok(
      status === "SUSPENDED" ? `${tenant.name} ditangguhkan.` : `${tenant.name} diaktifkan kembali.`,
      updated,
    );
  },

  async applyTemplate(templateId: string): Promise<ApiResult<number>> {
    const template = db.templates.find((entry) => entry.id === templateId);
    if (!template) return fail("Template tidak ditemukan.");
    let added = 0;
    const items = [...db.workspace.items];
    const batches = [...db.workspace.batches];

    for (const templateItem of template.items) {
      const existing = items.find((entry) => entry.name === templateItem.name);
      const itemId = existing?.id ?? `it-${template.id}-${templateItem.name.toLowerCase().replace(/\s+/g, "-")}`;
      if (!existing) {
        items.push({
          id: itemId,
          name: templateItem.name,
          baseUnit: templateItem.baseUnit,
          purchaseUnit: templateItem.purchaseUnit,
          conversionRate: templateItem.conversionRate,
          unitCost: templateItem.unitCost,
          minStock: templateItem.minStock,
        });
        batches.push({
          id: nextId("batch"),
          itemId,
          code: `${template.name.slice(0, 2).toUpperCase()}-${DEMO_TODAY.slice(2).replace(/-/g, "")}`,
          expiresAt: addDays(DEMO_TODAY, 120),
          qty: templateItem.conversionRate * 2,
          initialQty: templateItem.conversionRate * 2,
          unitCost: templateItem.unitCost,
          status: "ACTIVE",
        });
        added += 1;
      }
    }

    db.workspace = { ...db.workspace, items, batches };
    return ok(`Paket ${template.name} ditambahkan: ${added} barang baru.`, added);
  },

  async sendBroadcast(message: string): Promise<ApiResult<Broadcast>> {
    const trimmed = message.trim();
    if (!trimmed) return fail("Isi pengumuman masih kosong.");
    const broadcast: Broadcast = {
      id: nextId("bc"),
      message: trimmed,
      severity: "warning",
      createdAt: `${DEMO_TODAY}T07:00:00.000Z`,
    };
    db.broadcasts = [broadcast, ...db.broadcasts];
    return ok("Pengumuman ditayangkan ke warung aktif.", broadcast);
  },

  async updateStoreSettings(settings: { name: string; targetMargin: number; whatsapp: string }): Promise<ApiResult<null>> {
    if (!settings.name.trim()) return fail("Nama warung belum diisi.");
    if (settings.targetMargin < 0 || settings.targetMargin > 90) return fail("Target margin harus antara 0 dan 90 persen.");
    db.workspace = {
      ...db.workspace,
      store: {
        ...db.workspace.store,
        name: settings.name.trim(),
        targetMargin: settings.targetMargin,
        whatsapp: settings.whatsapp.trim(),
      },
    };
    return ok("Pengaturan warung disimpan.", null);
  },
};

export type Api = typeof api;
