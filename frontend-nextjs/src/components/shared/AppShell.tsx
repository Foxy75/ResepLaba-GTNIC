"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BarChart3, Boxes, CookingPot, LockKeyhole, ShieldCheck } from "lucide-react";
import { BroadcastBanner } from "@/components/shared/BroadcastBanner";
import { PinSheet } from "@/components/shared/PinSheet";
import { useWarung } from "@/lib/warung-store";

const tabs = [
  { href: "/app/pos", label: "Kasir", Icon: CookingPot },
  { href: "/app/stock", label: "Stok", Icon: Boxes },
  { href: "/app/owner", label: "Juragan", Icon: LockKeyhole },
];

export function AppShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { snapshot, profile, ownerOpen } = useWarung();
  const router = useRouter();
  const [pinOpen, setPinOpen] = useState(false);
  const store = snapshot.store;

  return (
    <main className="min-h-dvh bg-paper text-ink lg:pl-20 xl:pl-60">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/app/pos"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">
              RL
            </span>
            <span>
              <b className="block text-sm font-extrabold tracking-tight">ResepLaba</b>
              <small className="block text-xs text-ink-soft">{store.name}</small>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {profile === "admin" && (
              <Link
                href="/admin"
                className="hidden min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold sm:flex"
              >
                <ShieldCheck size={17} aria-hidden />Admin
              </Link>
            )}
            <span
              className={`hidden rounded-full px-3 py-2 text-xs font-semibold sm:inline-flex ${
                ownerOpen ? "bg-healthy-soft text-healthy" : "bg-paper text-ink-soft"
              }`}
            >
              {ownerOpen ? "Mode Juragan terbuka" : "Mode Penjaga"}
            </span>
            <Link
              href="/login"
              className="flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              Ganti demo
            </Link>
          </div>
        </div>
      </header>

      {store.status === "SUSPENDED" && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-critical-border bg-critical-soft px-4 py-3 text-sm font-semibold text-critical">
            Warung ditangguhkan platform. Penjaga tidak bisa membuka kasir sampai status aktif kembali.
          </div>
        </div>
      )}

      <div id="konten-utama" className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{subtitle}</p>}
        </div>
        <BroadcastBanner />
        {children}
      </div>

      <nav
        aria-label="Navigasi warung"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-sheet/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      >
        {tabs.map(({ href, label, Icon }) => {
          const isOwner = href === "/app/owner";
          if (isOwner && !ownerOpen) {
            return (
              <button
                key={href}
                type="button"
                onClick={() => setPinOpen(true)}
                aria-label="Buka mode juragan dengan PIN"
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-ink-soft transition duration-200 hover:bg-paper active:scale-[.98]"
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden />
                {label}
              </button>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold ${
                active === href ? "text-primary" : "text-ink-soft"
              }`}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Navigasi warung"
        className="fixed inset-y-0 left-0 hidden w-20 flex-col items-center gap-2 border-r border-line bg-sheet py-8 lg:flex xl:w-60 xl:items-stretch xl:px-4"
      >
        <Link
          href="/app/pos"
          className="mb-8 flex h-12 items-center justify-center gap-3 rounded-xl bg-primary text-sm font-bold text-white xl:justify-start xl:px-4"
        >
          <CookingPot size={19} aria-hidden />
          <span className="hidden xl:inline">Kasir & Stok</span>
        </Link>
        {tabs.map(({ href, label, Icon }) => {
          const isOwner = href === "/app/owner";
          if (isOwner && !ownerOpen) {
            return (
              <button
                key={href}
                type="button"
                onClick={() => setPinOpen(true)}
                className="flex min-h-12 items-center justify-center gap-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-paper xl:justify-start xl:px-4"
              >
                <Icon size={19} aria-hidden />
                <span className="hidden xl:inline">{label}</span>
              </button>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`flex min-h-12 items-center justify-center gap-3 rounded-xl text-sm font-semibold xl:justify-start xl:px-4 ${
                active === href ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-paper"
              }`}
            >
              <Icon size={19} aria-hidden />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          );
        })}
        <Link
          href="/admin"
          className="mt-auto flex min-h-12 items-center justify-center gap-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-paper xl:justify-start xl:px-4"
        >
          <BarChart3 size={19} aria-hidden />
          <span className="hidden xl:inline">Panel platform</span>
        </Link>
      </nav>

      <PinSheet
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onUnlocked={() => router.push("/app/owner")}
      />
    </main>
  );
}
