import { http } from "./http";
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
} from "./types";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  storeName: string;
  businessType?: "WARMINDO" | "MADURA" | "BAKERY" | "OTHER";
  whatsapp?: string;
  pin?: string;
};

export const api = {
  async selectProfile(profile: Profile): Promise<ApiResult<Snapshot>> {
    return http.post<Snapshot>("/auth/sandbox-login", { profile });
  },

  async login(email: string, password: string): Promise<ApiResult<Snapshot>> {
    return http.post<Snapshot>("/auth/login", { email, password });
  },

  async register(payload: RegisterPayload): Promise<ApiResult<Snapshot>> {
    return http.post<Snapshot>("/auth/register", payload);
  },

  async logout(): Promise<ApiResult<null>> {
    return http.post<null>("/auth/logout");
  },

  async workspace(): Promise<ApiResult<Snapshot>> {
    return http.get<Snapshot>("/store/workspace");
  },

  async checkout(lines: CheckoutInput): Promise<ApiResult<CheckoutOutput>> {
    return http.post<CheckoutOutput>("/pos/checkout", { items: lines });
  },

  async restock(input: RestockInput): Promise<ApiResult<{ batch: Batch; units: number; unitCost: number }>> {
    return http.post("/inventory/restock", input);
  },

  async scanReceipt(image?: File): Promise<ApiResult<ReceiptDraft>> {
    if (!image) return http.post<ReceiptDraft>("/inventory/ocr-receipt", {});
    const form = new FormData();
    form.append("image", image);
    return http.post<ReceiptDraft>("/inventory/ocr-receipt", form);
  },

  async saveReceiptDraft(rows: ReceiptDraftRow[]): Promise<ApiResult<{ added: number }>> {
    return http.post("/inventory/receipt/commit", { rows });
  },

  async adjustBatch(batchId: string, qty: number, reason: string): Promise<ApiResult<Batch>> {
    return http.patch(`/inventory/batches/${batchId}/adjust`, { qty, reason });
  },

  async markBatch(batchId: string, status: "DAMAGED" | "EXPIRED"): Promise<ApiResult<Batch>> {
    return http.patch(`/inventory/batches/${batchId}/status`, { status });
  },

  async getPromo(batchId: string): Promise<ApiResult<{ text: string }>> {
    return http.post(`/inventory/batches/${batchId}/promo`);
  },

  async removeBatch(batchId: string): Promise<ApiResult<null>> {
    return http.delete(`/inventory/batches/${batchId}`);
  },

  async saveProduct(product: Product): Promise<ApiResult<Product>> {
    if (product.id) return http.put(`/owner/products/${product.id}`, product);
    return http.post("/owner/products", product);
  },

  async deleteProduct(productId: string): Promise<ApiResult<null>> {
    return http.delete(`/owner/products/${productId}`);
  },

  async saveItem(item: InventoryItem): Promise<ApiResult<InventoryItem>> {
    if (item.id) return http.put(`/owner/items/${item.id}`, item);
    return http.post("/owner/items", item);
  },

  async verifyPin(pin: string): Promise<ApiResult<boolean>> {
    return http.post("/owner/verify-pin", { pin });
  },

  async setTenantStatus(tenantId: string, status: StoreStatus): Promise<ApiResult<Tenant>> {
    return http.patch(`/admin/stores/${tenantId}/status`, { status });
  },

  async applyTemplate(templateId: string): Promise<ApiResult<number>> {
    return http.post(`/owner/templates/${templateId}/apply`);
  },

  async sendBroadcast(message: string): Promise<ApiResult<Broadcast>> {
    return http.post("/admin/broadcasts", { message });
  },

  async updateStoreSettings(settings: {
    name: string;
    targetMargin: number;
    whatsapp: string;
  }): Promise<ApiResult<null>> {
    return http.patch("/owner/settings", settings);
  },

  async getProfitSummary(): Promise<
    ApiResult<{
      series: { day: string; omzet: number; hpp: number; laba: number }[];
      totals: { omzet: number; hpp: number; laba: number };
      marginPercent: number;
    }>
  > {
    return http.get("/owner/profit-summary");
  },
};

export type Api = typeof api;