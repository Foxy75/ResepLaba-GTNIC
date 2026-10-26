"use client";

import { useState } from "react";
import { ClipboardCheck, PackagePlus, Trash2, TriangleAlert } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { numberId } from "@/lib/format";
import { useWarung } from "@/lib/warung-store";
import type { Batch } from "@/lib/types";

export function OpnameSheet({
  batch,
  itemName,
  unit,
  open,
  onClose,
}: {
  batch: Batch | null;
  itemName: string;
  unit: string;
  open: boolean;
  onClose: () => void;
}) {
  const { adjustBatch, markBatch, removeBatch, pending } = useWarung();
  const { push } = useToast();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  const key = batch ? `batch-${batch.id}` : "";

  const submit = async () => {
    if (!batch) return;
    const value = Number(qty);
    if (!Number.isFinite(value) || value < 0) {
      push("Jumlah hasil opname harus angka nol atau lebih.", "danger");
      return;
    }
    const result = await adjustBatch(batch.id, value, reason.trim());
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    setQty("");
    setReason("");
    onClose();
  };

  const mark = async (status: "DAMAGED" | "EXPIRED") => {
    if (!batch) return;
    const result = await markBatch(batch.id, status);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    onClose();
  };

  const remove = async () => {
    if (!batch) return;
    const result = await removeBatch(batch.id);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Opname batch"
      description={batch ? `${itemName} Â· batch ${batch.code}` : undefined}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Tutup
          </Button>
          <Button block loading={pending[key]} onClick={() => void submit()}>
            Simpan hasil opname
          </Button>
        </>
      }
    >
      {batch && (
        <div className="space-y-4">
          <div className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
            Stok sistem saat ini <b className="text-ink">{numberId(batch.qty)} {unit}</b> dari total awal{" "}
            <b className="text-ink">{numberId(batch.initialQty)} {unit}</b>. Isi jumlah hasil hitung fisik di rak.
          </div>
          <Field label={`Jumlah hasil hitung (${unit})`} htmlFor="opname-qty">
            <Input
              id="opname-qty"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              placeholder={String(batch.qty)}
            />
          </Field>
          <Field label="Catatan opname" htmlFor="opname-reason">
            <Textarea
              id="opname-reason"
              rows={2}
              maxLength={120}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: 2 bungkus rusak, sisanya laku"
            />
          </Field>
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
            <Button
              variant="secondary"
              block
              icon={<TriangleAlert size={17} aria-hidden />}
              loading={pending[key]}
              onClick={() => void mark("DAMAGED")}
            >
              Tandai rusak
            </Button>
            <Button
              variant="secondary"
              block
              icon={<ClipboardCheck size={17} aria-hidden />}
              loading={pending[key]}
              onClick={() => void mark("EXPIRED")}
            >
              Tandai kedaluwarsa
            </Button>
            <Button
              variant="danger"
              block
              icon={<Trash2 size={17} aria-hidden />}
              loading={pending[key]}
              onClick={() => void remove()}
            >
              Hapus batch
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function RestockSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snapshot, restock, pending } = useWarung();
  const { push } = useToast();
  const [itemId, setItemId] = useState(snapshot.items[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [code, setCode] = useState("");

  const item = snapshot.items.find((entry) => entry.id === itemId);
  const purchaseQty = Number(qty);
  const totalCost = Number(cost);
  const units = item && purchaseQty > 0 ? purchaseQty * item.conversionRate : 0;
  const unitCost = units > 0 && totalCost > 0 ? totalCost / units : 0;

  const submit = async () => {
    const result = await restock({ itemId, purchaseQty, totalCost, expiresAt, code });
    if (!result.success || !result.data) {
      push(result.message, "danger");
      return;
    }
    push(
      `${result.message} ${numberId(result.data.units)} ${item?.baseUnit ?? "satuan"} masuk dengan modal ${Math.round(result.data.unitCost)} per satuan.`,
    );
    for (const warning of result.warnings) push(warning, "info");
    setQty("1");
    setCost("");
    setExpiresAt("");
    setCode("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Catat belanja masuk"
      description="Kulakan grosir dipecah otomatis ke satuan jual, dan modal menu dihitung ulang."
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button block loading={pending.restock} onClick={() => void submit()}>
            Simpan belanjaan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Barang" htmlFor="restock-item">
          <select
            id="restock-item"
            value={itemId}
            onChange={(event) => {
              setItemId(event.target.value);
              setCost("");
            }}
            className="min-h-12 w-full rounded-xl border border-line bg-sheet px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {snapshot.items.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} Â· 1 {entry.purchaseUnit} isi {numberId(entry.conversionRate)} {entry.baseUnit}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Jumlah ${item?.purchaseUnit ?? "kemasan"}`} htmlFor="restock-qty">
            <Input
              id="restock-qty"
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          </Field>
          <Field label="Total harga (Rp)" htmlFor="restock-cost">
            <Input
              id="restock-cost"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="Contoh: 120000"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal kedaluwarsa" htmlFor="restock-expiry">
            <Input
              id="restock-expiry"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Field>
          <Field label="Kode batch (opsional)" htmlFor="restock-code">
            <Input
              id="restock-code"
              value={code}
              maxLength={24}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Contoh: T-2611-C"
            />
          </Field>
        </div>
        {item && (
          <div className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
            {numberId(purchaseQty)} {item.purchaseUnit} x {numberId(item.conversionRate)} {item.baseUnit} ={" "}
            <b className="text-ink">{numberId(units)} {item.baseUnit}</b>. Modal baru{" "}
            <b className="text-ink">{Math.round(unitCost).toLocaleString("id-ID")}</b> per {item.baseUnit}.
          </div>
        )}
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm leading-5 text-warning">
          <PackagePlus size={17} className="mt-0.5 shrink-0" aria-hidden />
          Tanggal kedaluwarsa wajib diisi manual. Selalu periksa kemasan saat mencatat belanja.
        </p>
      </div>
    </Sheet>
  );
}



