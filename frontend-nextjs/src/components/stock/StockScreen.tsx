"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ClipboardList,
  PackagePlus,
  PackageOpen,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Sparkline } from "@/components/charts";
import { OpnameSheet, RestockSheet } from "@/components/stock/StockSheets";
import { PromoSheet, ReceiptStagingSheet } from "@/components/stock/StagingSheets";
import { Badge, Button, EmptyState, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { dateId, numberId, rupiah } from "@/lib/format";
import {
  addDays,
  daysLeft,
  DEMO_TODAY,
  expiryLabel,
  expiryState,
  sortBatchesFefo,
  stockOf,
} from "@/lib/domain";
import { useWarung } from "@/lib/warung-store";
import type { Batch, ReceiptDraftRow } from "@/lib/types";

type StockFilter = "semua" | "segera" | "habis";

const TODAY = DEMO_TODAY;

export function StockScreen() {
  const { snapshot, scanReceipt, pending } = useWarung();
  const { push } = useToast();
  const [tab, setTab] = useState<"batch" | "nota">("batch");
  const [filter, setFilter] = useState<StockFilter>("semua");
  const [restockOpen, setRestockOpen] = useState(false);
  const [draft, setDraft] = useState<ReceiptDraftRow[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [opnameBatch, setOpnameBatch] = useState<Batch | null>(null);
  const [promoBatch, setPromoBatch] = useState<Batch | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const items = snapshot.items;
  const batches = snapshot.batches;
 
  const usableBatches = useMemo(
    () => sortBatchesFefo(batches.filter((batch) => batch.qty > 0 && batch.status !== "DAMAGED" && batch.status !== "EXPIRED")),
    [batches],
  );

  const summary = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    for (const item of items) {
      const next = usableBatches.find((batch) => batch.itemId === item.id);
      if (!next) {
        critical += 1;
        continue;
      }
      const left = daysLeft(next.expiresAt, TODAY);
      if (left <= 1) critical += 1;
      else if (left <= 3) warning += 1;
      else healthy += 1;
    }
    return { healthy, warning, critical };
  }, [items, usableBatches]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const stock = stockOf(item.id, batches, TODAY);
      if (filter === "habis") return stock <= 0;
      if (filter === "segera") {
        const next = usableBatches.find((batch) => batch.itemId === item.id);
        if (!next) return false;
        return daysLeft(next.expiresAt, TODAY) <= 3;
      }
      return true;
    });
  }, [batches, filter, items, usableBatches]);

  const startScan = async (image?: File) => {
    const result = await scanReceipt(image);
    if (!result.success || !result.data) {
      push(result.message, "danger");
      return;
    }
    setDraft(result.data.rows);
    setDraftKey((value) => value + 1);
    setDraftOpen(true);
    push("Draf nota dibuat. Periksa dulu sebelum disimpan.");
  };

  const promoItem = promoBatch ? items.find((item) => item.id === promoBatch.itemId) : undefined;

  return (
    <AppShell active="/app/stock" title="Stok & belanja" subtitle="Pantau stok barang yang harus cepat dijual lebih dulu, serta catat kulakan agar modal menu tetap akurat.">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Tabs<"batch" | "nota">
          label="Tampilan stok"
          items={[
            { id: "batch", label: "Daftar Stok Barang", count: items.length },
            { id: "nota", label: "Catat dari nota" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Button
          className="ml-auto"
          icon={<PackagePlus size={17} aria-hidden />}
          onClick={() => setRestockOpen(true)}
        >
          Belanja masuk
        </Button>
      </div>

      {tab === "batch" ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <SummaryChip label="Sehat" count={summary.healthy} tone="healthy" />
            <SummaryChip label="Segera H-3" count={summary.warning} tone="warning" />
            <SummaryChip label="Kritis H-1" count={summary.critical} tone="critical" />
          </div>

          {summary.critical + summary.warning > 0 && (
            <div className="mb-5 flex gap-3 rounded-2xl border border-critical-border bg-critical-soft p-4">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-critical" aria-hidden />
              <div>
                <p className="text-sm font-bold text-critical">
                  {summary.critical + summary.warning} barang perlu diperiksa
                </p>
                <p className="mt-1 text-sm leading-5 text-ink-soft">
                  Prioritaskan barang yang kedaluwarsa dalam tiga hari. Penjualan kasir otomatis mendahulukan barang terdekat lebih dulu.
                </p>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Tabs<StockFilter>
              label="Filter barang"
              items={[
                { id: "semua", label: "Semua barang" },
                { id: "segera", label: "Segera kedaluwarsa" },
                { id: "habis", label: "Habis" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>

          {visibleItems.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleItems.map((item) => {
                const itemBatches = usableBatches.filter((batch) => batch.itemId === item.id);
                const stock = stockOf(item.id, batches, TODAY);
                const low = stock < item.minStock;
                return (
                  <article key={item.id} className="rounded-2xl border border-line bg-sheet p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-bold">{item.name}</h2>
                        <p className="mt-1 text-xs text-ink-soft">
                          {numberId(stock)} {item.baseUnit} tersedia (minimal {numberId(item.minStock)})
                        </p>
                      </div>
                      {low ? (
                        <Badge tone="warning">Sisa sedikit</Badge>
                      ) : (
                        <Badge tone="healthy">Stok aman</Badge>
                      )}
                    </div>

                    {itemBatches.length ? (
                      <ul className="mt-4 divide-y divide-line">
                        {itemBatches.map((batch, batchIndex) => {
                          const left = daysLeft(batch.expiresAt, TODAY);
                          const state = expiryState(left);
                          return (
                            <li key={batch.id} className="py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    Stok Masuk #{batchIndex + 1} ({numberId(batch.qty)} {item.baseUnit})
                                  </p>
                                  <p className="mt-1 text-xs text-ink-soft">
                                    Batas Kedaluwarsa: {dateId(batch.expiresAt)} — Modal: {rupiah(batch.unitCost)}/{item.baseUnit}
                                  </p>
                                </div>
                                <Badge
                                  tone={state === "critical" ? "critical" : state === "warning" ? "warning" : "healthy"}
                                >
                                  {expiryLabel(left)}
                                </Badge>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <Sparkline
                                  values={[30, 22, 14, left <= 3 ? Math.max(left, 0) : 20, left <= 3 ? Math.max(left, 0) : 10]}
                                  tone={state === "critical" ? "critical" : state === "warning" ? "warning" : "primary"}
                                />
                                <div className="flex gap-2">
                                  {state !== "healthy" && (
                                    <Button
                                      variant="secondary"
                                      className="min-h-12 px-3 text-xs"
                                      icon={<Sparkles size={15} aria-hidden />}
                                      onClick={() => setPromoBatch(batch)}
                                    >
                                      Ide Promo
                                    </Button>
                                  )}
                                  <Button
                                    variant="secondary"
                                    className="min-h-12 px-3 text-xs"
                                    icon={<ClipboardList size={15} aria-hidden />}
                                    onClick={() => setOpnameBatch(batch)}
                                    title="Hitung ulang fisik barang di rak"
                                  >
                                    Hitung Fisik
                                  </Button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="mt-4 rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
                        Belum ada stok aktif. Catat belanja masuk untuk menambah stok.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<PackageOpen size={24} aria-hidden />}
              title={filter === "habis" ? "Tidak ada barang kosong." : "Belum ada barang."}
              description={
                filter === "habis"
                  ? "Semua barang masih punya stok aktif."
                  : "Mulai dari paket siap pakai Warung Madura atau catat belanja pertama."
              }
              action={
                <Button icon={<PackagePlus size={17} aria-hidden />} onClick={() => setRestockOpen(true)}>
                  Catat belanja masuk
                </Button>
              }
            />
          )}
        </>
      ) : (
        <section className="max-w-2xl rounded-2xl border border-line bg-sheet p-5 sm:p-6" aria-labelledby="nota-title">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gold-soft text-gold-deep">
              <ScanLine size={20} aria-hidden />
            </span>
            <div>
              <h2 id="nota-title" className="font-bold">
                Baca nota kulakan
              </h2>
              <p className="mt-1 text-sm leading-5 text-ink-soft">
                Hasil pindai nota selalu jadi draf yang bisa diedit. Tidak ada barang masuk stok sebelum kamu menyetujuinya.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Foto nota belanja"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void startScan(file);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={<Camera size={17} aria-hidden />}
                onClick={() => fileRef.current?.click()}
              >
                Pilih / foto nota
              </Button>
              <Button
                icon={<ScanLine size={17} aria-hidden />}
                loading={pending.ocr}
                onClick={() => void startScan()}
              >
                Pindai nota belanja
              </Button>
            </div>
            <p className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
              Ambil foto nota belanja dengan tombol &ldquo;Pilih / foto nota&rdquo;, atau langsung klik &ldquo;Pindai nota belanja&rdquo; untuk memakai contoh nota Agen Sumber Rezeki.
            </p>
          </div>
        </section>
      )}

      <RestockSheet open={restockOpen} onClose={() => setRestockOpen(false)} />
      <ReceiptStagingSheet
        key={draftKey}
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        draft={draft}
      />
      <OpnameSheet
        open={Boolean(opnameBatch)}
        onClose={() => setOpnameBatch(null)}
        batch={opnameBatch}
        itemName={opnameBatch ? items.find((item) => item.id === opnameBatch.itemId)?.name ?? "" : ""}
        unit={opnameBatch ? items.find((item) => item.id === opnameBatch.itemId)?.baseUnit ?? "" : ""}
      />
      <PromoSheet
        open={Boolean(promoBatch)}
        onClose={() => setPromoBatch(null)}
        itemName={promoItem?.name ?? ""}
        batchCode={promoBatch?.code ?? ""}
        days={promoBatch ? Math.max(daysLeft(promoBatch.expiresAt, TODAY), 0) : 0}
        qty={promoBatch?.qty ?? 0}
        batchId={promoBatch?.id ?? ""}
      />
    </AppShell>
  );
}

function SummaryChip({ label, count, tone }: { label: string; count: number; tone: "healthy" | "warning" | "critical" }) {
  const tones = {
    healthy: "border-healthy-border bg-healthy-soft text-healthy",
    warning: "border-warning-border bg-warning-soft text-warning",
    critical: "border-critical-border bg-critical-soft text-critical",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-3xl font-extrabold tabular">{count}</p>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}






