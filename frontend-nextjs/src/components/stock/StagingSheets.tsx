"use client";

import { useState } from "react";
import { ClipboardCopy, ReceiptText, ScanLine } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { dateId, numberId, rupiah } from "@/lib/format";
import { useWarung } from "@/lib/warung-store";
import type { ReceiptDraftRow } from "@/lib/types";

export function ReceiptStagingSheet({
  open,
  onClose,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  draft: ReceiptDraftRow[];
}) {
  const { snapshot, saveReceiptDraft, pending } = useWarung();
  const { push } = useToast();
  const [rows, setRows] = useState<ReceiptDraftRow[]>(draft);

  const update = (index: number, patch: Partial<ReceiptDraftRow>) => {
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    const result = await saveReceiptDraft(rows);
    if (!result.success || !result.data) {
      push(result.message, "danger");
      for (const warning of result.warnings) push(warning, "info");
      return;
    }
    push(result.message);
    for (const warning of result.warnings) push(warning, "info");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Draf nota belanja"
      description="Baris hasil baca nota. Periksa jumlah, harga, dan tanggal sebelum disimpan ke stok."
      size="lg"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button block loading={pending.ocr} onClick={() => void submit()}>
            Simpan ke stok
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {rows.map((row, index) => (
          <article key={`${row.itemId}-${index}`} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{row.name}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  1 {row.purchaseUnit} isi {numberId(row.conversionRate)} Â· {rupiah(row.totalCost)}
                </p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                {numberId(row.purchaseQty * row.conversionRate)} satuan dasar
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Jumlah kemasan" htmlFor={`draft-qty-${index}`}>
                <Input
                  id={`draft-qty-${index}`}
                  type="number"
                  min="0.01"
                  step="any"
                  value={String(row.purchaseQty)}
                  onChange={(event) => update(index, { purchaseQty: Number(event.target.value) })}
                />
              </Field>
              <Field label="Total harga (Rp)" htmlFor={`draft-cost-${index}`}>
                <Input
                  id={`draft-cost-${index}`}
                  type="number"
                  min="1"
                  step="1"
                  value={String(row.totalCost)}
                  onChange={(event) => update(index, { totalCost: Number(event.target.value) })}
                />
              </Field>
              <Field label="Kedaluwarsa" htmlFor={`draft-expiry-${index}`}>
                <Input
                  id={`draft-expiry-${index}`}
                  type="date"
                  value={row.expiresAt}
                  onChange={(event) => update(index, { expiresAt: event.target.value })}
                />
              </Field>
            </div>
            {row.expiresAt && (
              <p className="mt-2 text-xs text-ink-soft">Berlaku sampai {dateId(row.expiresAt)}</p>
            )}
          </article>
        ))}
        {!rows.length && (
          <p className="rounded-xl bg-paper p-4 text-sm text-ink-soft">
            Belum ada baris nota. Tekan pindai nota untuk membuat draf baru.
          </p>
        )}
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm leading-5 text-warning">
          <ReceiptText size={17} className="mt-0.5 shrink-0" aria-hidden />
          Tanggal kedaluwarsa tidak selalu terbaca dari nota. Isi manual dari kemasan sebelum menyimpan.
        </p>
        <p className="text-xs text-ink-soft">
          Barang yang belum terdaftar dilewati saat menyimpan. Daftar barang saat ini:{" "}
          {snapshot.items.map((item) => item.name).join(", ")}.
        </p>
      </div>
    </Sheet>
  );
}

export function PromoSheet({
  open,
  onClose,
  itemName,
  batchCode,
  days,
  qty,
}: {
  open: boolean;
  onClose: () => void;
  itemName: string;
  batchCode: string;
  days: number;
  qty: number;
}) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = [
      `PROMO TEBUS MURAH ${itemName.toUpperCase()}`,
      `Batch ${batchCode}, sisa ${qty}, expires dalam ${days} hari.`,
      "",
      `Promo hari ini: ${itemName} diskon 20%. Stok terbatas, buruan ya.`,
      `Bisa titip ke etalase depan biar laku sebelum basi.`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      push("Teks promo siap ditempel ke WhatsApp.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      push("Browser menolak menyalin. Pilih teksnya lalu salin manual.", "danger");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ide promo TEBUS MURAH"
      description="Bantu barang mendekati kedaluwarsa laku sebelum dibuang."
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Tutup
          </Button>
          <Button block icon={<ClipboardCopy size={17} aria-hidden />} onClick={() => void copy()}>
            {copied ? "Tersalin" : "Salin teks promo"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-warning-border bg-warning-soft p-4">
          <p className="text-sm font-bold text-warning">{itemName} perlu laku</p>
          <p className="mt-1 text-sm leading-6 text-warning">
            Batch {batchCode} tinggal {qty} dengan jarak {days} hari ke tanggal kedaluwarsa.
          </p>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl border border-line bg-paper p-4 text-sm leading-6 text-ink">
          {`PROMO TEBUS MURAH ${itemName.toUpperCase()}\nBatch ${batchCode}, sisa ${qty}, expires dalam ${days} hari.\n\nPromo hari ini: ${itemName} diskon 20%. Stok terbatas, buruan ya.\nBisa titip ke etalase depan biar laku sebelum basi.`}
        </pre>
        <p className="flex items-start gap-2 text-xs leading-5 text-ink-soft">
          <ScanLine size={15} className="mt-0.5 shrink-0" aria-hidden />
          Copy ini bisa langsung dikirim ke grup pelanggan warung lewat WhatsApp.
        </p>
      </div>
    </Sheet>
  );
}




