"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useWarung } from "@/lib/warung-store";

export function StoreSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snapshot, saveStoreSettings, pending } = useWarung();
  const { push } = useToast();
  const store = snapshot.store;
  const [name, setName] = useState(store.name);
  const [targetMargin, setTargetMargin] = useState(String(store.targetMargin));
  const [whatsapp, setWhatsapp] = useState(store.whatsapp);

  const submit = async () => {
    const result = await saveStoreSettings({
      name,
      targetMargin: Number(targetMargin),
      whatsapp,
    });
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
      title="Pengaturan warung"
      description="Nama usaha, target margin, dan nomor WhatsApp untuk pesanan stok."
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
          <Button block loading={pending.settings} icon={<Save size={17} aria-hidden />} onClick={() => void submit()}>
            Simpan pengaturan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama warung" htmlFor="store-name">
          <Input
            id="store-name"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Target margin (%)" htmlFor="store-target" hint="Dipakai sebagai batas aman di simulator harga.">
          <Input
            id="store-target"
            type="number"
            min="0"
            max="90"
            step="1"
            inputMode="numeric"
            value={targetMargin}
            onChange={(event) => setTargetMargin(event.target.value)}
          />
        </Field>
        <Field label="Nomor WhatsApp agen" htmlFor="store-whatsapp" hint="Dipakai saat membuat pesanan stok ke agen.">
          <Input
            id="store-whatsapp"
            value={whatsapp}
            inputMode="numeric"
            onChange={(event) => setWhatsapp(event.target.value)}
          />
        </Field>
        <p className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
          PIN juragan demo tetap 1234. Pada versi terhubung ke server, PIN diganti dan disimpan sebagai hash.
        </p>
      </div>
    </Sheet>
  );
}
