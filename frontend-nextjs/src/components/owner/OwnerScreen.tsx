"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  LockKeyhole,
  LockKeyholeOpen,
  Pencil,
  Plus,
  Settings,
  ShoppingBasket,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PinSheet } from "@/components/shared/PinSheet";
import { BarList, MarginGauge, ProfitChart } from "@/components/charts";
import { ItemSettingsSheet, RecipeEditorSheet } from "@/components/owner/RecipeEditor";
import { StoreSettingsSheet } from "@/components/owner/StoreSettingsSheet";
import { Sheet } from "@/components/ui/overlay";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Stat,
  Tabs,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { dateId, dateTimeId, numberId, rupiah } from "@/lib/format";
import {
  computeHpp,
  DEMO_TODAY,
  lowStockItems,
  marginPercent,
  marginState,
  marginStateLabel,
  profitByProduct,
  recommendedPrice,
  seriesByDay,
  stockOrderText,
} from "@/lib/domain";
import { useWarung } from "@/lib/warung-store";
import type { Product, Transaction } from "@/lib/types";

type Period = "today" | "week" | "month";

const periodTabs: { id: Period; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "week", label: "7 hari" },
  { id: "month", label: "30 hari" },
];

export function OwnerScreen() {
  const {
    snapshot,
    ownerOpen,
    lockOwner,
    saveProduct,
    deleteProduct,
    pending,
  } = useWarung();
  const { push } = useToast();
  const [period, setPeriod] = useState<Period>("today");
  const [pinOpen, setPinOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [itemSettingsOpen, setItemSettingsOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerTransaction, setLedgerTransaction] = useState<Transaction | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const products = snapshot.products;
  const items = snapshot.items;
  const transactions = snapshot.transactions;
  const store = snapshot.store;

  const series = useMemo(() => seriesByDay(transactions, 7, DEMO_TODAY), [transactions]);

  const periodTransactions = useMemo(() => {
    if (period === "today") return transactions.filter((transaction) => transaction.day === DEMO_TODAY);
    if (period === "week") return transactions.filter((transaction) => transaction.day >= series[0]?.day);
    return transactions;
  }, [period, series, transactions]);

  const revenue = periodTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
  const totalHpp = periodTransactions.reduce((sum, transaction) => sum + transaction.hpp, 0);
  const profit = revenue - totalHpp;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  const productProfit = useMemo(() => profitByProduct(periodTransactions), [periodTransactions]);

  const marginRows = useMemo(
    () =>
      products.map((product) => {
        const hpp = computeHpp(product, items);
        const current = marginPercent(product.price, hpp);
        return {
          product,
          hpp,
          current,
          state: marginState(current, product.targetMargin),
          suggestion: recommendedPrice(hpp, product.targetMargin),
        };
      }),
    [items, products],
  );

  const risky = marginRows.filter((row) => row.state !== "safe").sort((a, b) => a.current - b.current);
  const selected = risky[0] ?? marginRows[0];
  const [simProductId, setSimProductId] = useState<string>("");
  const activeProduct = products.find((product) => product.id === simProductId) ?? selected?.product ?? products[0];
  const activeHpp = activeProduct ? computeHpp(activeProduct, items) : 0;
  const activeMargin = activeProduct ? marginPercent(activeProduct.price, activeHpp) : 0;
  const activeTarget = activeProduct?.targetMargin ?? store.targetMargin;
  const activeState = marginState(activeMargin, activeTarget);
  const [simPrice, setSimPrice] = useState(0);
  const [simInitialized, setSimInitialized] = useState(false);

  const price = simInitialized && simPrice > 0 ? simPrice : activeProduct?.price ?? 0;
  const simMargin = marginPercent(price, activeHpp);
  const suggestion = recommendedPrice(activeHpp, activeTarget);

  const lowStock = useMemo(() => lowStockItems(items, snapshot.batches, DEMO_TODAY), [items, snapshot.batches]);

  const orderText = useMemo(
    () => stockOrderText(store, lowStock, snapshot.batches, DEMO_TODAY),
    [lowStock, snapshot.batches, store],
  );

  if (!ownerOpen) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-sheet p-6 shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LockKeyhole size={22} aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Kantong Laba</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Laporan laba, racikan menu, dan pengaturan harga hanya terbuka untuk juragan.
          </p>
          <Button block className="mt-5" onClick={() => setPinOpen(true)}>
            Masukkan PIN
          </Button>
          <p className="mt-4 text-center text-xs text-ink-soft">PIN demo: 1234</p>
        </div>
        <PinSheet open={pinOpen} onClose={() => setPinOpen(false)} />
      </main>
    );
  }

  const openEditor = (product: Product | null) => {
    setEditing(product);
    setEditorKey((value) => value + 1);
    setEditorOpen(true);
  };

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderText);
      setCopied(true);
      push("Pesanan stok siap ditempel ke WhatsApp.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      push("Browser menolak menyalin. Pilih teksnya lalu salin manual.", "danger");
    }
  };

  const removeProduct = async (product: Product) => {
    const result = await deleteProduct(product.id);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
  };

  return (
    <AppShell active="/app/owner" title="Kantong Laba" subtitle="Pantau hasil jualan dan sesuaikan harga saat modal berubah.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-healthy-border bg-healthy-soft px-4 py-3">
          <LockKeyholeOpen size={17} className="text-healthy" aria-hidden />
          <span className="text-sm font-semibold text-healthy">Mode Juragan terbuka</span>
          <Button variant="ghost" className="min-h-12 px-3 text-xs" onClick={lockOwner}>
            Kunci
          </Button>
        </div>
        <Tabs<Period> label="Periode laporan" items={periodTabs} value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Omzet" value={rupiah(revenue)} hint={`Periode ${period === "today" ? "hari ini" : period === "week" ? "7 hari" : "30 hari"}`} />
        <Stat label="Modal terpakai" value={rupiah(totalHpp)} hint="HPP dari menu yang terjual" />
        <Stat label="Laba bersih" value={rupiah(profit)} hint={`Margin ${margin}%`} tone="primary" />
        <Stat
          label="Transaksi"
          value={numberId(periodTransactions.length)}
          hint={`${numberId(periodTransactions.reduce((sum, transaction) => sum + transaction.lines.reduce((count, line) => count + line.qty, 0), 0))} item terjual`}
        />
      </div>

      {risky.length > 0 && (
        <section className="mt-6 rounded-2xl border border-warning-border bg-warning-soft p-5" aria-labelledby="margin-alert">
          <div className="flex items-start gap-3">
            <TrendingDown size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <div>
              <h2 id="margin-alert" className="font-bold text-warning">
                {risky.length} menu perlu harga ditinjau
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Modal kulakan terakhir membuat margin menu turun. Geser simulator harga untuk melihat harga yang
                menjaga laba.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {risky.slice(0, 3).map((row) => (
              <li key={row.product.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/75 px-3 py-2">
                <span className="text-sm font-semibold">{row.product.name}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={row.state === "critical" ? "critical" : "warning"}>
                    Margin {row.current}%
                  </Badge>
                  <span className="text-xs text-ink-soft">Saran {rupiah(row.suggestion)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-sheet p-5" aria-labelledby="profit-chart-title">
        <h2 id="profit-chart-title" className="text-lg font-bold">
          Kantong laba 7 hari terakhir
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Batang menunjukkan omzet, garis menunjukkan laba bersih.</p>
        <div className="mt-4 overflow-x-auto">
          <ProfitChart data={series} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-sheet p-5" aria-labelledby="simulator-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="simulator-title" className="text-lg font-bold">
              Simulator harga
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Geser untuk melihat perubahan margin menu.</p>
          </div>
          <TrendingUp size={19} className="text-primary" aria-hidden />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Field label="Menu" htmlFor="sim-menu">
              <select
                id="sim-menu"
                value={activeProduct?.id ?? ""}
                onChange={(event) => {
                  setSimProductId(event.target.value);
                  setSimInitialized(false);
                }}
                className="min-h-12 w-full rounded-xl border border-line bg-sheet px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-paper p-4">
                <p className="text-xs text-ink-soft">Modal racikan</p>
                <p className="mt-1 text-lg font-extrabold tabular">{rupiah(activeHpp)}</p>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <p className="text-xs text-ink-soft">Harga saat ini</p>
                <p className="mt-1 text-lg font-extrabold tabular">{rupiah(activeProduct?.price ?? 0)}</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold" htmlFor="sim-price">
              Simulasi harga jual
              <span className="float-right tabular text-primary">{rupiah(price)}</span>
              <input
                id="sim-price"
                type="range"
                min={Math.max(500, Math.floor(activeHpp / 500) * 500)}
                max={Math.max(10000, (activeProduct?.price ?? 0) + 10000)}
                step="500"
                value={price || 500}
                onChange={(event) => {
                  setSimInitialized(true);
                  setSimPrice(Number(event.target.value));
                }}
                aria-valuetext={rupiah(price)}
                className="mt-4 w-full accent-[#0E6B4A]"
              />
            </label>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-paper p-4">
              <div>
                <p className="text-xs text-ink-soft">Margin simulasi</p>
                <strong className="mt-1 block text-xl tabular">{simMargin}%</strong>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-soft">Saran minimum</p>
                <strong className="mt-1 block text-xl tabular text-primary">{rupiah(suggestion)}</strong>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" block onClick={() => { setSimInitialized(true); setSimPrice(suggestion); }}>
                Pakai saran
              </Button>
              <Button
                block
                loading={pending.recipe}
                onClick={async () => {
                  if (!activeProduct) return;
                  const result = await saveProduct({ ...activeProduct, price });
                  if (!result.success) {
                    push(result.message, "danger");
                    return;
                  }
                  push(`Harga ${activeProduct.name} disimpan ${rupiah(price)}.`);
                  setSimInitialized(false);
                }}
              >
                Simpan harga baru
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-paper p-4">
            <MarginGauge margin={simMargin} target={activeTarget} />
            <p
              className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${
                activeState === "safe"
                  ? "bg-healthy-soft text-healthy"
                  : activeState === "thin"
                    ? "bg-warning-soft text-warning"
                    : "bg-critical-soft text-critical"
              }`}
            >
              {marginStateLabel(activeState, simMargin)}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="profit-menu-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profit-menu-title" className="text-lg font-bold">
                Laba per menu
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Menu paling untung dan paling perlu ditinjau.</p>
            </div>
          </div>
          {productProfit.length ? (
            <div className="mt-4">
              <BarList
                rows={productProfit.map((row) => ({
                  label: row.name,
                  value: row.laba,
                  hint: `${numberId(row.qty)} porsi Â· modal ${rupiah(row.hpp)}`,
                  tone: row.laba > 0 ? "primary" : "critical",
                }))}
                formatValue={rupiah}
              />
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Belum ada transaksi di periode ini."
                description="Jual menu lewat layar Kasir agar laporan laba terisi."
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="recipe-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="recipe-title" className="text-lg font-bold">
                Racikan & konversi satuan
              </h2>
              <p className="mt-1 text-sm text-ink-soft">HPP dihitung dari komposisi dan modal satuan terbaru.</p>
            </div>
            <Button
              variant="secondary"
              className="min-h-12 px-3 text-xs"
              icon={<Plus size={15} aria-hidden />}
              onClick={() => openEditor(null)}
            >
              Menu baru
            </Button>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {products.map((product) => {
              const hpp = computeHpp(product, items);
              const current = marginPercent(product.price, hpp);
              return (
                <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{product.name}</b>
                    <small className="mt-1 block text-xs text-ink-soft">
                      {product.recipe
                        .map((line) => {
                          const item = items.find((entry) => entry.id === line.itemId);
                          return `${numberId(line.qty)} ${item?.baseUnit ?? ""} ${item?.name ?? ""}`;
                        })
                        .join(" + ")}
                    </small>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold tabular">{rupiah(hpp)}</span>
                    <Badge tone={current >= product.targetMargin ? "healthy" : "warning"}>{current}%</Badge>
                    <Button
                      variant="secondary"
                      className="min-h-12 px-3"
                      aria-label={`Ubah ${product.name}`}
                      onClick={() => openEditor(product)}
                    >
                      <Pencil size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-12 px-3"
                      aria-label={`Hapus ${product.name}`}
                      onClick={() => void removeProduct(product)}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>

          <Button
            variant="secondary"
            block
            className="mt-4"
            onClick={() => {
              setItemId(items[0]?.id ?? null);
              setItemSettingsOpen(true);
            }}
          >
            Atur konversi satuan bahan
          </Button>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-sheet p-5" aria-labelledby="ledger-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="ledger-title" className="text-lg font-bold">
              Transaksi terbaru
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Catatan transaksi demo. Ketuk baris untuk melihat rincian.</p>
          </div>
          <Button variant="secondary" className="min-h-12 px-3 text-xs" onClick={() => setLedgerOpen(true)}>
            Lihat semua
          </Button>
        </div>
        {transactions.length ? (
          <ul className="mt-4 divide-y divide-line">
            {transactions.slice(0, 5).map((transaction) => (
              <li key={transaction.id}>
                <button
                  type="button"
                  onClick={() => {
                    setLedgerTransaction(transaction);
                    setLedgerOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span>
                    <b className="block text-sm">{transaction.id}</b>
                    <small className="mt-1 block text-xs text-ink-soft">
                      {dateTimeId(transaction.createdAt)} Â·{" "}
                      {transaction.lines.reduce((sum, line) => sum + line.qty, 0)} item
                    </small>
                  </span>
                  <span className="text-sm font-bold tabular">{rupiah(transaction.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Belum ada transaksi."
              description="Jual menu lewat layar Kasir untuk mengisi laporan laba."
            />
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-sheet p-5" aria-labelledby="order-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="order-title" className="text-lg font-bold">
              Pesan barang kurang ke agen
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {lowStock.length
                ? `${lowStock.length} barang di bawah stok minimum.`
                : "Semua barang masih di atas stok minimum."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="min-h-12 px-3 text-xs"
              icon={<Settings size={15} aria-hidden />}
              onClick={() => setSettingsOpen(true)}
            >
              Pengaturan warung
            </Button>
            <Button
              variant="secondary"
              className="min-h-12 px-3 text-xs"
              icon={<ShoppingBasket size={15} aria-hidden />}
              onClick={() => setOrderOpen(true)}
            >
              Buat pesanan
            </Button>
          </div>
        </div>
      </section>

      <RecipeEditorSheet
        key={editorKey}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        product={editing}
      />
      <ItemSettingsSheet
        key={itemId ?? "none"}
        open={itemSettingsOpen}
        onClose={() => setItemSettingsOpen(false)}
        item={items.find((item) => item.id === itemId) ?? null}
      />
      <StoreSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Sheet
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        title="Transaksi terbaru"
        description={`${numberId(transactions.length)} transaksi tercatat`}
        size="lg"
      >
        <ul className="divide-y divide-line">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <button
                type="button"
                onClick={() => setLedgerTransaction(transaction)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span>
                  <b className="block text-sm">{transaction.id}</b>
                  <small className="mt-1 block text-xs text-ink-soft">
                    {dateId(transaction.day)} Â· {dateTimeId(transaction.createdAt)}
                  </small>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold tabular">{rupiah(transaction.total)}</span>
                  <small className="mt-1 block text-xs text-ink-soft tabular">Laba {rupiah(transaction.profit)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet
        open={Boolean(ledgerTransaction)}
        onClose={() => setLedgerTransaction(null)}
        title={ledgerTransaction?.id ?? "Rincian transaksi"}
        description={ledgerTransaction ? `${dateId(ledgerTransaction.day)} Â· ${rupiah(ledgerTransaction.total)}` : undefined}
      >
        {ledgerTransaction && (
          <div>
            <ul className="divide-y divide-line">
              {ledgerTransaction.lines.map((line) => (
                <li key={line.productId} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <b className="block text-sm">{line.name}</b>
                    <small className="mt-1 block text-xs text-ink-soft tabular">
                      {line.qty} x {rupiah(line.price)} Â· modal {rupiah(line.hpp)}
                    </small>
                  </span>
                  <span className="text-sm font-bold tabular">{rupiah(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Total</span>
                <b className="tabular">{rupiah(ledgerTransaction.total)}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Modal terpakai</span>
                <b className="tabular">{rupiah(ledgerTransaction.hpp)}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Laba</span>
                <b className="tabular text-primary">{rupiah(ledgerTransaction.profit)}</b>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Pesanan stok ke agen"
        description="Salin lalu kirim ke WhatsApp agen grosir."
        footer={
          <>
            <Button variant="secondary" block onClick={() => setOrderOpen(false)}>
              Tutup
            </Button>
            <Button block icon={<ClipboardCopy size={17} aria-hidden />} onClick={() => void copyOrder()}>
              {copied ? "Tersalin" : "Salin pesan"}
            </Button>
          </>
        }
      >
        <pre className="whitespace-pre-wrap rounded-2xl border border-line bg-paper p-4 text-sm leading-6 text-ink">
          {orderText}
        </pre>
      </Sheet>
    </AppShell>
  );
}

