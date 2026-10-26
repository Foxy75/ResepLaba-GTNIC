"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CookingPot, ShieldCheck, Store } from "lucide-react";
import { Button, Field, Input, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useWarung } from "@/lib/warung-store";
import type { Profile } from "@/lib/types";

const profiles: { id: Profile; name: string; detail: string; Icon: typeof Store }[] = [
  { id: "madura", name: "Warung Madura Berkah", detail: "Barang eceran dan batch mendekati kedaluwarsa", Icon: Store },
  { id: "warmindo", name: "Warmindo Cak Budi", detail: "Menu racikan, kasir, dan Margin Guard", Icon: CookingPot },
  { id: "admin", name: "Super Admin Platform", detail: "Tenant, starter pack, dan kuota AI", Icon: ShieldCheck },
];

export default function LoginPage() {
  const router = useRouter();
  const { selectProfile } = useWarung();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [manualError, setManualError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const enter = async (profile: Profile) => {
    setBusy(true);
    const result = await selectProfile(profile);
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    push(`Selamat datang, ${result.data?.store.name ?? "warung"}.`);
    router.push(profile === "admin" ? "/admin" : "/app/pos");
  };

  const manualLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) {
      setManualError("Isi surel warung dulu.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setManualError("PIN harus 4 angka.");
      return;
    }
    if (pin !== "1234") {
      setManualError("PIN salah. Untuk demo, PIN larangan adalah 1234.");
      return;
    }
    setManualError("");
    const profile: Profile = value.includes("madura") ? "madura" : "warmindo";
    await enter(profile);
  };

  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,.9fr)]">
      <a
        href="#pilih-profil"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-sheet focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-primary"
      >
        Lewati ke pilihan profil
      </a>
      <section className="login-hero-surface relative hidden min-h-dvh flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-sm font-extrabold">
            RL
          </span>
          <span className="text-lg font-extrabold">ResepLaba</span>
        </div>
        <div className="relative z-10 max-w-xl pb-12">
          <p className="text-sm font-semibold text-white/75">Untuk warung yang ingin tahu angka sebenarnya</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.08] tracking-[-.045em]">
            Stok terjaga.
            <br />
            Laba lebih pasti.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/80">
            Kasir, catatan batch, dan hitungan modal bekerja bersama supaya juragan punya kendali.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-sm text-white/75">
          <span className="h-px w-10 bg-white/40" />
          Dibuat untuk usaha harian Indonesia
        </div>
        <div className="absolute -right-24 top-1/4 size-96 rounded-full border border-white/10" />
        <div className="absolute -right-10 top-[30%] size-64 rounded-full border border-white/10" />
      </section>

      <section
        id="pilih-profil"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-10 lg:px-12"
      >
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">
            RL
          </span>
          <span className="text-base font-extrabold">ResepLaba</span>
        </div>

        <div className="mb-7">
          <p className="text-sm font-semibold text-gold-deep">Mode Simulasi Juri</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Pilih usaha untuk dicoba</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Masuk satu klik. Data contoh sudah disiapkan untuk demo.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Menyiapkan data demo">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[76px] w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-critical-border bg-critical-soft p-5">
            <p className="text-sm font-bold text-critical">Contoh warung belum siap.</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setError("")}>
              Ulangi
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map(({ id, name, detail, Icon }) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => void enter(id)}
                aria-label={`Masuk sebagai ${name}`}
                className="group flex min-h-[76px] w-full items-center gap-4 rounded-2xl border border-line bg-sheet px-4 text-left transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-primary">
                  <Icon size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{name}</b>
                  <small className="mt-1 block text-xs leading-5 text-ink-soft">{detail}</small>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-ink-soft transition group-hover:translate-x-1 group-hover:text-primary"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        )}

        <details className="mt-6 rounded-2xl border border-line bg-sheet px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Masuk manual</summary>
          <form onSubmit={manualLogin} className="mt-4 space-y-4">
            <Field label="Surel warung" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="warung@resep.laba"
                autoComplete="username"
              />
            </Field>
            <Field label="PIN juragan" htmlFor="login-pin" error={manualError}>
              <Input
                id="login-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, ""));
                  setManualError("");
                }}
                placeholder="1234"
              />
            </Field>
            <Button type="submit" block loading={busy}>
              Masuk ke warung
            </Button>
          </form>
        </details>

        <p className="mt-7 text-xs leading-5 text-ink-soft">
          Simulasi memakai data lokal di browser. Tidak perlu membuat akun atau memasukkan data pribadi.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-soft">
          <span>Privasi</span>
          <span>Bantuan</span>
          <span>Versi demo 1.0</span>
        </div>
      </section>
    </main>
  );
}


