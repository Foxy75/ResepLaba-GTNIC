"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, currentSnapshot } from "@/lib/api";
import type {
  ApiResult,
  Batch,
  Broadcast,
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
} from "@/lib/types";

type WarungContextValue = {
  snapshot: Snapshot;
  profile: Profile;
  cart: Record<string, number>;
  cartCount: number;
  cartTotal: number;
  ownerOpen: boolean;
  pending: Record<string, boolean>;
  dismissedBroadcasts: string[];
  selectProfile: (profile: Profile) => Promise<ApiResult<Snapshot>>;
  addToCart: (productId: string) => void;
  changeCart: (productId: string, delta: number) => void;
  clearCart: () => void;
  checkout: () => Promise<ApiResult<CheckoutOutput>>;
  restock: (input: RestockInput) => Promise<ApiResult<{ batch: Batch; units: number; unitCost: number }>>;
  scanReceipt: () => Promise<ApiResult<ReceiptDraft>>;
  saveReceiptDraft: (rows: ReceiptDraftRow[]) => Promise<ApiResult<{ added: number }>>;
  adjustBatch: (batchId: string, qty: number, reason: string) => Promise<ApiResult<Batch>>;
  markBatch: (batchId: string, status: "DAMAGED" | "EXPIRED") => Promise<ApiResult<Batch>>;
  removeBatch: (batchId: string) => Promise<ApiResult<null>>;
  saveProduct: (product: Product) => Promise<ApiResult<Product>>;
  deleteProduct: (productId: string) => Promise<ApiResult<null>>;
  saveItem: (item: InventoryItem) => Promise<ApiResult<InventoryItem>>;
  verifyPin: (pin: string) => Promise<boolean>;
  lockOwner: () => void;
  setTenantStatus: (tenantId: string, status: StoreStatus) => Promise<ApiResult<Tenant>>;
  applyTemplate: (templateId: string) => Promise<ApiResult<number>>;
  sendBroadcast: (message: string) => Promise<ApiResult<Broadcast>>;
  dismissBroadcast: (broadcastId: string) => void;
  saveStoreSettings: (settings: { name: string; targetMargin: number; whatsapp: string }) => Promise<ApiResult<null>>;
};

const Context = createContext<WarungContextValue | null>(null);

export function WarungProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => currentSnapshot());
  const [profile, setProfile] = useState<Profile>("warmindo");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setSnapshot(currentSnapshot());
  }, []);

  const run = useCallback(
    async <T,>(key: string, action: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> => {
      setPending((state) => ({ ...state, [key]: true }));
      try {
        const result = await action();
        refresh();
        return result;
      } finally {
        setPending((state) => ({ ...state, [key]: false }));
      }
    },
    [refresh],
  );

  const value = useMemo<WarungContextValue>(() => {
    const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const cartTotal = snapshot.products.reduce(
      (sum, product) => sum + (cart[product.id] ?? 0) * product.price,
      0,
    );

    return {
      snapshot,
      profile,
      cart,
      cartCount,
      cartTotal,
      ownerOpen,
      pending,
      dismissedBroadcasts,
      selectProfile: async (next) => {
        setProfile(next);
        setCart({});
        setOwnerOpen(false);
        const result = await api.selectProfile(next);
        refresh();
        return result;
      },
      addToCart: (productId) =>
        setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 })),
      changeCart: (productId, delta) =>
        setCart((current) => {
          const qty = (current[productId] ?? 0) + delta;
          if (qty <= 0) {
            const next = { ...current };
            delete next[productId];
            return next;
          }
          return { ...current, [productId]: qty };
        }),
      clearCart: () => setCart({}),
      checkout: () => run("checkout", () => api.checkout(Object.entries(cart).map(([productId, qty]) => ({ productId, qty })))),
      restock: (input) => run("restock", () => api.restock(input)),
      scanReceipt: () => run("ocr", () => api.scanReceipt()),
      saveReceiptDraft: (rows) => run("ocr", () => api.saveReceiptDraft(rows)),
      adjustBatch: (batchId, qty, reason) => run(`batch-${batchId}`, () => api.adjustBatch(batchId, qty, reason)),
      markBatch: (batchId, status) => run(`batch-${batchId}`, () => api.markBatch(batchId, status)),
      removeBatch: (batchId) => run(`batch-${batchId}`, () => api.removeBatch(batchId)),
      saveProduct: (product) => run("recipe", () => api.saveProduct(product)),
      deleteProduct: (productId) => run("recipe", () => api.deleteProduct(productId)),
      saveItem: (item) => run("item", () => api.saveItem(item)),
      verifyPin: async (pin) => {
        const result = await api.verifyPin(pin);
        if (result.success) setOwnerOpen(true);
        return result.success;
      },
      lockOwner: () => setOwnerOpen(false),
      setTenantStatus: (tenantId, status) => run(`tenant-${tenantId}`, () => api.setTenantStatus(tenantId, status)),
      applyTemplate: (templateId) => run("template", () => api.applyTemplate(templateId)),
      sendBroadcast: (message) => run("broadcast", () => api.sendBroadcast(message)),
      dismissBroadcast: (broadcastId) =>
        setDismissedBroadcasts((current) =>
          current.includes(broadcastId) ? current : [...current, broadcastId],
        ),
      saveStoreSettings: (settings) => run("settings", () => api.updateStoreSettings(settings)),
    };
  }, [cart, dismissedBroadcasts, ownerOpen, pending, profile, refresh, run, snapshot]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWarung() {
  const context = useContext(Context);
  if (!context) throw new Error("useWarung must be used inside WarungProvider");
  return context;
}
