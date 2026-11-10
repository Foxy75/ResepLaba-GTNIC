"use client";

import { useEffect, useState } from "react";
import { Delete, LockKeyhole } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { useWarung } from "@/lib/warung-store";

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinSheet({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const { verifyPin } = useWarung();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPin("");
    setError("");
    setCooldown(0);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (value.length !== 4 || cooldown > 0 || submitting) return;
    setSubmitting(true);
    try {
      const result = await verifyPin(value);
      if (result.success) {
        setPin("");
        setError("");
        onUnlocked?.();
        close();
        return;
      }
      setPin("");
      const msg = result.message || "PIN salah. Coba lagi.";
      setError(msg);
      if (msg.includes("dikunci") || msg.includes("terkunci")) {
        setCooldown(60);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const press = (value: string) => {
    if (cooldown > 0) return;
    if (value === "back") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (!value) return;
    const next = `${pin}${value}`.slice(0, 4);
    setPin(next);
    if (next.length === 4) void submit(next);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Mode Juragan"
      description="Masukkan PIN 4 angka untuk membuka laporan laba dan pengaturan racikan."
    >
      <div className="flex flex-col items-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LockKeyhole size={22} aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink-soft">PIN juragan</p>
        <div
          className="mt-3 flex gap-3"
          aria-label={`${pin.length} dari 4 angka terisi`}
          aria-live="polite"
        >
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`size-4 rounded-full ${index < pin.length ? "bg-primary" : "bg-line"}`}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-semibold text-critical">
            {error}
          </p>
        )}
        {cooldown > 0 && (
          <p className="mt-3 text-center text-sm font-semibold text-warning">
            Tunggu {cooldown} detik sebelum mencoba lagi.
          </p>
        )}
        <div className="mt-5 grid w-full max-w-[280px] grid-cols-3 gap-3">
          {digits.map((digit, index) => {
            if (!digit) return <span key={`empty-${index}`} aria-hidden />;
            if (digit === "back") {
              return (
                <button
                  key="back"
                  type="button"
                  onClick={() => press("back")}
                  disabled={cooldown > 0}
                  aria-label="Hapus angka terakhir"
                  className="flex min-h-16 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-desk disabled:opacity-50"
                >
                  <Delete size={22} aria-hidden />
                </button>
              );
            }
            return (
              <button
                key={digit}
                type="button"
                onClick={() => press(digit)}
                disabled={cooldown > 0}
                aria-label={`Angka ${digit}`}
                className="min-h-16 rounded-xl border border-line bg-sheet text-xl font-bold text-ink transition hover:bg-paper disabled:opacity-50"
              >
                {digit}
              </button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          block
          className="mt-5"
          loading={submitting}
          onClick={() => void submit(pin)}
          disabled={pin.length !== 4 || cooldown > 0}
        >
          Buka mode juragan
        </Button>
        <p className="mt-3 text-xs text-ink-soft">PIN bawaan akun: 1234 (dapat diubah di Pengaturan Warung)</p>
      </div>
    </Sheet>
  );
}

