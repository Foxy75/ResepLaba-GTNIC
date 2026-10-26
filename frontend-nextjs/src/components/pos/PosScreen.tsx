"use client";

import { useMemo, useState } from "react";
import {
  Coffee,
  CookingPot,
  CupSoda,
  Egg,
  Minus,
  Package,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Soup,
  Wheat,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Sheet } from "@/components/ui/overlay";
import { Badge, Button, EmptyState, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useWarung } from "@/lib/warung-store";
import { rupiah } from "@/lib/format";
import { portionsAvailable } from "@/lib/domain";
import type { Product, ProductCategory, ProductIcon, Transaction } from "@/lib/types";

const productIcons: Record<ProductIcon, typeof CookingPot> = {
  meal: CookingPot,
  egg: Egg,
  rice: Wheat,
  drink: CupSoda,
  soup: Soup,
  coffee: Coffee,
  pack: Package,
};

const categoryTabs: { id: ProductCategory | "semua"; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "makanan", label: "Makanan" },
  { id: "minuman", label: "Minuman" },
  { id: "eceran", label: "Eceran" },
];

function stockBadge(portions: number) {
  if (portions <= 0) return <Badge tone="critical">Stok habis</Badge>;
  if (portions <= 3) return <Badge tone="warning">Sisa {portions} porsi</Badge>;
  return <Badge tone="healthy">Sisa {portions} porsi</Badge>;
}

export function PosScreen() {
  const {
    snapshot,
    cart,
    cartCount,
    cartTotal,
    addToCart,
    changeCart,
    clearCart,
    checkout,
    pending,
  } = useWarung();
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "semua">("semua");
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const products = snapshot.products;
  const items = snapshot.items;
  const batches = snapshot.batches;
  const suspended = snapshot.store.status === "SUSPENDED";

  const portions = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [
          product.id,
          portionsAvailable(product, items, batches),
        ]),
      ) as Record<string, number>,
    [batches, items, products],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = category === "semua" || product.category === category;
      const matchKeyword = !keyword || product.name.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [category, products, query]);

  const cartRows = products.filter((product) => (cart[product.id] ?? 0) > 0);

  const pay = async () => {
    const result = await checkout();
    if (!result.success || !result.data) {
      push(result.message, "danger");
      return;
    }
    const transaction = result.data.transaction;
    clearCart();
    setCartOpen(false);
    setReceipt(transaction);
    const sold = transaction.lines.map((line) => `${line.qty} ${line.name}`).join(", ");
    push(`Terjual ${sold}.`);
  };

  return (
    <AppShell active="/app/pos" title="Kasir" subtitle="Penjaga melayani. Stok terpotong otomatis dari batch terdekat.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="catalog-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="catalog-title" className="text-lg font-bold tracking-tight">
                Menu warung
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Ketuk menu untuk menambah ke keranjang.</p>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
              {products.length} menu
            </span>
          </div>

          <div className="relative mb-4">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari menu warung"
              aria-label="Cari menu warung"
              className="min-h-12 w-full rounded-xl border border-line bg-sheet pl-10 pr-3 text-sm placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>

          <Tabs<ProductCategory | "semua">
            label="Kategori menu"
            items={categoryTabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              count: tab.id === "semua" ? products.length : products.filter((product) => product.category === tab.id).length,
            }))}
            value={category}
            onChange={setCategory}
          />

          {filtered.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((product) => {
                const Icon = productIcons[product.icon];
                const remaining = portions[product.id] ?? 0;
                const soldOut = remaining <= 0 || suspended;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product.id)}
                    disabled={soldOut}
                    aria-label={`Tambah ${product.name}, ${rupiah(product.price)}`}
                    className="group flex min-h-36 flex-col rounded-2xl border border-line bg-sheet p-4 text-left transition hover:border-primary/40 hover:shadow-sm active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-paper text-primary">
                      <Icon size={21} strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="mt-4 block text-sm font-semibold leading-snug">{product.name}</span>
                    <span className="mt-2 block text-lg font-bold tabular text-ink">{rupiah(product.price)}</span>
                    <span className="mt-2 block">{stockBadge(remaining)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<Search size={24} aria-hidden />}
                title="Belum ada produk bernama itu."
                description="Coba kata lain atau buka Mode Juragan untuk mendaftarkan menu baru."
              />
            </div>
          )}
        </section>

        <aside className="hidden h-fit rounded-2xl border border-line bg-sheet p-4 lg:sticky lg:top-6 lg:block" aria-label="Keranjang belanja">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Keranjang</h2>
            <span className="text-xs text-ink-soft">{cartCount} item</span>
          </div>
          {cartRows.length ? (
            <ul className="mt-4 divide-y divide-line">
              {cartRows.map((product) => (
                <CartLine
                  key={product.id}
                  product={product}
                  qty={cart[product.id] ?? 0}
                  onChange={changeCart}
                />
              ))}
            </ul>
          ) : (
            <div className="my-5 rounded-xl bg-paper px-4 py-5 text-center">
              <p className="text-sm font-semibold">Keranjang kosong</p>
              <p className="mt-1 text-xs text-ink-soft">Pilih menu untuk mulai transaksi.</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-soft">Total bayar</span>
            <strong className="text-xl tabular" aria-live="polite">
              {rupiah(cartTotal)}
            </strong>
          </div>
          <Button
            block
            className="mt-4"
            loading={pending.checkout}
            disabled={!cartRows.length || suspended}
            onClick={() => void pay()}
          >
            Bayar {rupiah(cartTotal)}
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-ink-soft">
            Stok diambil dari batch dengan tanggal kedaluwarsa terdekat.
          </p>
        </aside>
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-[72px] z-20 border-t border-line bg-sheet px-4 py-3 shadow-[0_-6px_18px_rgba(28,25,23,.06)] lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex min-h-12 flex-1 items-center gap-2 rounded-xl bg-paper px-3 text-left text-sm font-semibold"
            >
              <ShoppingCart size={18} className="text-primary" aria-hidden />
              {cartCount} item
              <span className="ml-auto tabular">{rupiah(cartTotal)}</span>
            </button>
            <Button className="flex-1" loading={pending.checkout} disabled={suspended} onClick={() => void pay()}>
              Bayar
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Keranjang belanja"
        description={`${cartCount} item siap dibayar`}
        footer={
          <>
            <Button variant="secondary" block onClick={() => setCartOpen(false)}>
              Lanjut pilih menu
            </Button>
            <Button
              block
              loading={pending.checkout}
              disabled={!cartRows.length || suspended}
              onClick={() => void pay()}
            >
              Bayar {rupiah(cartTotal)}
            </Button>
          </>
        }
      >
        {cartRows.length ? (
          <ul className="divide-y divide-line">
            {cartRows.map((product) => (
              <CartLine
                key={product.id}
                product={product}
                qty={cart[product.id] ?? 0}
                onChange={changeCart}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ShoppingCart size={24} aria-hidden />}
            title="Keranjang kosong."
            description="Pilih menu di katalog untuk mulai transaksi."
          />
        )}
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm text-ink-soft">Total bayar</span>
          <strong className="text-xl tabular" aria-live="polite">
            {rupiah(cartTotal)}
          </strong>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Transaksi tersimpan"
        description={receipt ? `${receipt.id} Â· ${rupiah(receipt.total)}` : undefined}
        footer={
          <Button block onClick={() => setReceipt(null)}>
            Selesai, lanjut jualan
          </Button>
        }
      >
        {receipt && (
          <div>
            <div className="rounded-2xl bg-primary-soft p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Receipt size={17} aria-hidden /> Struk penjualan
              </div>
              <p className="mt-2 text-3xl font-extrabold tabular text-ink">{rupiah(receipt.total)}</p>
              <p className="mt-1 text-xs text-ink-soft">Modal terpakai {rupiah(receipt.hpp)}</p>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {receipt.lines.map((line) => (
                <li key={line.productId} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{line.name}</b>
                    <small className="mt-1 block text-xs text-ink-soft tabular">
                      {line.qty} x {rupiah(line.price)}
                    </small>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular">
                    {rupiah(line.price * line.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-ink-soft">Laba menu ini</span>
              <b className="tabular">{rupiah(receipt.profit)}</b>
            </div>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function CartLine({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (productId: string, delta: number) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="mt-1 text-xs text-ink-soft tabular">{rupiah(product.price)} / porsi</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(product.id, -1)}
          aria-label={`Kurangi ${product.name}`}
          className="flex size-12 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-primary-soft"
        >
          <Minus size={17} aria-hidden />
        </button>
        <span className="min-w-8 text-center text-sm font-bold tabular">{qty}</span>
        <button
          type="button"
          onClick={() => onChange(product.id, 1)}
          aria-label={`Tambah ${product.name}`}
          className="flex size-12 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-primary-soft"
        >
          <Plus size={17} aria-hidden />
        </button>
      </div>
    </li>
  );
}



