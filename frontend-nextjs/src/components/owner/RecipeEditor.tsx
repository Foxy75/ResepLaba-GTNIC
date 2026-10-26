"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { numberId, rupiah } from "@/lib/format";
import { computeHpp, marginPercent, recommendedPrice } from "@/lib/domain";
import { useWarung } from "@/lib/warung-store";
import type { InventoryItem, Product, ProductCategory, RecipeLine } from "@/lib/types";

const emptyProduct = (): Product => ({
  id: "",
  name: "",
  kind: "recipe",
  category: "makanan",
  icon: "meal",
  price: 0,
  targetMargin: 25,
  recipe: [{ itemId: "", qty: 1, wastePct: 0 }],
});

export function RecipeEditorSheet({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const { snapshot, saveProduct, pending } = useWarung();
  const { push } = useToast();
  const items = snapshot.items;
  const [draft, setDraft] = useState<Product>(
    product ?? { ...emptyProduct(), recipe: [{ itemId: items[0]?.id ?? "", qty: 1, wastePct: 0 }] },
  );

  const hpp = computeHpp(draft, items);
  const margin = marginPercent(draft.price, hpp);
  const suggestion = recommendedPrice(hpp, draft.targetMargin);

  const updateLine = (index: number, patch: Partial<RecipeLine>) => {
    setDraft((current) => ({
      ...current,
      recipe: current.recipe.map((line, position) =>
        position === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const addLine = () =>
    setDraft((current) => ({
      ...current,
      recipe: [...current.recipe, { itemId: items[0]?.id ?? "", qty: 1, wastePct: 0 }],
    }));

  const removeLine = (index: number) =>
    setDraft((current) => ({
      ...current,
      recipe: current.recipe.filter((_, position) => position !== index),
    }));

  const submit = async () => {
    const payload: Product = {
      ...draft,
      id: draft.id || `menu-${Date.now().toString(36)}`,
      recipe: draft.recipe.filter((line) => line.itemId && line.qty > 0),
    };
    const result = await saveProduct(payload);
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
      title={product ? "Ubah menu racikan" : "Menu racikan baru"}
      description="Tentukan bahan, takaran, dan harga jual. Modal dihitung dari harga beli terbaru."
      size="lg"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button block loading={pending.recipe} icon={<Save size={17} aria-hidden />} onClick={() => void submit()}>
            Simpan menu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama menu" htmlFor="recipe-name">
            <Input
              id="recipe-name"
              value={draft.name}
              maxLength={60}
              onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
              placeholder="Contoh: Mie Goreng Telur + Nasi"
            />
          </Field>
          <Field label="Jenis" htmlFor="recipe-kind">
            <Select
              id="recipe-kind"
              value={draft.kind}
              onChange={(event) =>
                setDraft((current) => ({ ...current, kind: event.target.value as Product["kind"] }))
              }
            >
              <option value="recipe">Racikan (beberapa bahan)</option>
              <option value="retail">Eceran (satu barang)</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Harga jual (Rp)" htmlFor="recipe-price">
            <Input
              id="recipe-price"
              type="number"
              min="0"
              step="100"
              inputMode="numeric"
              value={String(draft.price || "")}
              onChange={(event) =>
                setDraft((current) => ({ ...current, price: Number(event.target.value) }))
              }
            />
          </Field>
          <Field label="Target margin (%)" htmlFor="recipe-target">
            <Input
              id="recipe-target"
              type="number"
              min="0"
              max="90"
              step="1"
              inputMode="numeric"
              value={String(draft.targetMargin)}
              onChange={(event) =>
                setDraft((current) => ({ ...current, targetMargin: Number(event.target.value) }))
              }
            />
          </Field>
          <Field label="Kelompok" htmlFor="recipe-category">
            <Select
              id="recipe-category"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value as ProductCategory }))
              }
            >
              <option value="makanan">Makanan</option>
              <option value="minuman">Minuman</option>
              <option value="eceran">Eceran</option>
            </Select>
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Bahan racikan</p>
            <Button variant="ghost" className="min-h-12 px-3 text-xs" icon={<Plus size={15} aria-hidden />} onClick={addLine}>
              Tambah bahan
            </Button>
          </div>
          <ul className="mt-3 space-y-3">
            {draft.recipe.map((line, index) => (
              <li key={index} className="rounded-2xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_100px_auto]">
                  <Field label="Bahan" htmlFor={`line-item-${index}`}>
                    <Select
                      id={`line-item-${index}`}
                      value={line.itemId}
                      onChange={(event) => updateLine(index, { itemId: event.target.value })}
                    >
                      <option value="">Pilih bahan</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.baseUnit})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Takaran" htmlFor={`line-qty-${index}`}>
                    <Input
                      id={`line-qty-${index}`}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={String(line.qty)}
                      onChange={(event) => updateLine(index, { qty: Number(event.target.value) })}
                    />
                  </Field>
                  <Field label="Susut (%)" htmlFor={`line-waste-${index}`}>
                    <Input
                      id={`line-waste-${index}`}
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      inputMode="numeric"
                      value={String(line.wastePct)}
                      onChange={(event) => updateLine(index, { wastePct: Number(event.target.value) })}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      variant="secondary"
                      className="min-h-12 px-3"
                      aria-label={`Hapus bahan ${index + 1}`}
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 size={17} aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-paper p-4 text-sm leading-6 text-ink-soft">
          Modal racikan saat ini <b className="text-ink">{rupiah(hpp)}</b>. Margin{" "}
          <b className="text-ink">{margin}%</b>. Hargaminimal untuk target {draft.targetMargin}% adalah{" "}
          <b className="text-primary">{rupiah(suggestion)}</b>.
        </div>
      </div>
    </Sheet>
  );
}

export function ItemSettingsSheet({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}) {
  const { saveItem, pending } = useWarung();
  const { push } = useToast();
  const [draft, setDraft] = useState<InventoryItem | null>(item);

  const submit = async () => {
    if (!draft) return;
    const result = await saveItem(draft);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    onClose();
  };

  const conversionPreview = useMemo(() => {
    if (!draft) return "";
    const units = draft.conversionRate * 2;
    return `2 ${draft.purchaseUnit} = ${numberId(units)} ${draft.baseUnit}`;
  }, [draft]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Konversi satuan"
      description="Atur isi per kemasan dan batas stok minimum untuk bahan ini."
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button block loading={pending.item} onClick={() => void submit()}>
            Simpan barang
          </Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-4">
          <Field label="Nama barang" htmlFor="item-name">
            <Input
              id="item-name"
              value={draft.name}
              maxLength={60}
              onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Satuan jual" htmlFor="item-unit">
              <Input
                id="item-unit"
                value={draft.baseUnit}
                maxLength={16}
                onChange={(event) => setDraft((current) => (current ? { ...current, baseUnit: event.target.value } : current))}
              />
            </Field>
            <Field label="Satuan beli" htmlFor="item-purchase">
              <Input
                id="item-purchase"
                value={draft.purchaseUnit}
                maxLength={24}
                onChange={(event) => setDraft((current) => (current ? { ...current, purchaseUnit: event.target.value } : current))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Isi per 1 ${draft.purchaseUnit}`} htmlFor="item-conversion" hint={conversionPreview}>
              <Input
                id="item-conversion"
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={String(draft.conversionRate)}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, conversionRate: Number(event.target.value) } : current,
                  )
                }
              />
            </Field>
            <Field label="Stok minimum" htmlFor="item-min">
              <Input
                id="item-min"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={String(draft.minStock)}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, minStock: Number(event.target.value) } : current,
                  )
                }
              />
            </Field>
          </div>
          <p className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
            Modal rata-rata bahan ini {rupiah(draft.unitCost)} per {draft.baseUnit}. Modal dihitung ulang setiap kali
            ada kulakan baru.
          </p>
        </div>
      )}
    </Sheet>
  );
}




