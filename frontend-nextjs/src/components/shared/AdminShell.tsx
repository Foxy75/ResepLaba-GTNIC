"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Megaphone, PackageCheck, Store, type LucideIcon } from "lucide-react";
import { useWarung } from "@/lib/warung-store";

export type AdminSection = "ringkasan" | "warung" | "broadcast" | "starter";

const sections: { id: AdminSection; label: string; Icon: LucideIcon }[] = [
  { id: "ringkasan", label: "Ringkasan", Icon: BarChart3 },
  { id: "warung", label: "Warung", Icon: Store },
  { id: "broadcast", label: "Broadcast", Icon: Megaphone },
  { id: "starter", label: "Starter pack", Icon: PackageCheck },
];

export function AdminShell({
  section,
  onSectionChange,
  children,
}: {
  section: AdminSection;
  onSectionChange: (next: AdminSection) => void;
  children: ReactNode;
}) {
  const { snapshot } = useWarung();

  return (
    <main className="min-h-dvh bg-paper text-ink lg:pl-64">
      <a
        href="#konten-admin"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">
              RL
            </span>
            <span>
              <b className="block text-sm font-extrabold tracking-tight">Panel platform</b>
              <small className="block text-xs text-ink-soft">Super Admin ResepLaba</small>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/pos"
              className="flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              Buka kasir
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kendali platform</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Pantau kesehatan tenant, batasi kuota pemindai nota, dan siarkan pengumuman harga ke seluruh warung.
          </p>
        </div>

        <nav aria-label="Bagian panel platform" className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {sections.map(({ id, label, Icon }) => {
            const isActive = id === section;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSectionChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  isActive ? "bg-primary text-white" : "border border-line bg-sheet text-ink-soft hover:bg-paper"
                }`}
              >
                <Icon size={17} aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>

        <div id="konten-admin">{children}</div>

        <p className="mt-8 text-xs leading-5 text-ink-soft">
          Data panel memakai data contoh lokal di browser. Status suspend, template, dan pengumuman belum
          tersambung ke server produksi. Tenant aktif: {snapshot.tenants.filter((tenant) => tenant.status === "ACTIVE").length} dari{" "}
          {snapshot.tenants.length} warung.
        </p>
      </div>
    </main>
  );
}
