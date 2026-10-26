"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Building2,
  CheckCircle2,
  Megaphone,
  PackageCheck,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Store,
} from "lucide-react";
import { AdminShell, type AdminSection } from "@/components/shared/AdminShell";
import { BarList } from "@/components/charts";
import { Sheet } from "@/components/ui/overlay";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Stat,
  Tabs,
  Textarea,
  } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { dateId, numberId } from "@/lib/format";
import { useWarung } from "@/lib/warung-store";
import type { Template, Tenant } from "@/lib/types";

type TenantFilter = "semua" | "aktif" | "ditangguhkan";

export function AdminScreen() {
  const { snapshot, setTenantStatus, applyTemplate, sendBroadcast, pending } = useWarung();
  const { push } = useToast();
  const [section, setSection] = useState<AdminSection>("ringkasan");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TenantFilter>("semua");
  const [detail, setDetail] = useState<Tenant | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [broadcast, setBroadcast] = useState("");
  const [confirmTenant, setConfirmTenant] = useState<Tenant | null>(null);

  const tenants = snapshot.tenants;
  const templates = snapshot.templates;
  const broadcasts = snapshot.broadcasts;

  const activeCount = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
  const suspendedCount = tenants.length - activeCount;
  const quotaUsed = tenants.reduce((sum, tenant) => sum + tenant.aiUsed, 0);
  const quotaTotal = tenants.reduce((sum, tenant) => sum + tenant.aiQuota, 0);

  const filteredTenants = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchQuery = !keyword || tenant.name.toLowerCase().includes(keyword);
      const matchFilter =
        filter === "semua" ||
        (filter === "aktif" && tenant.status === "ACTIVE") ||
        (filter === "ditangguhkan" && tenant.status === "SUSPENDED");
      return matchQuery && matchFilter;
    });
  }, [filter, query, tenants]);

  const statusRows = [
    { label: "Warung aktif", value: activeCount, tone: "healthy" as const },
    { label: "Warung ditangguhkan", value: suspendedCount, tone: "critical" as const },
  ];

  const quotaRows = tenants.map((tenant) => ({
    label: tenant.name,
    value: tenant.aiUsed,
    hint: `Kuota harian ${tenant.aiUsed}/${tenant.aiQuota} scan`,
    tone: tenant.aiUsed >= tenant.aiQuota ? ("critical" as const) : ("primary" as const),
  }));

  const toggleTenant = async (tenant: Tenant) => {
    const next = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await setTenantStatus(tenant.id, next);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    setDetail(null);
  };

  const applyPack = async (selected: Template) => {
    const result = await applyTemplate(selected.id);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    setTemplate(null);
  };

  const sendMessage = async () => {
    const result = await sendBroadcast(broadcast);
    if (!result.success) {
      push(result.message, "danger");
      return;
    }
    push(result.message);
    setBroadcast("");
  };

  return (
    <AdminShell section={section} onSectionChange={setSection}>
      {section === "ringkasan" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Warung terdaftar" value={numberId(tenants.length)} icon={<Store size={19} className="text-primary" aria-hidden />} />
            <Stat label="Tenant aktif" value={numberId(activeCount)} icon={<ShieldCheck size={19} className="text-primary" aria-hidden />} hint={`${suspendedCount} ditangguhkan`} />
            <Stat
              label="Kuota OCR terpakai"
              value={`${quotaUsed}/${quotaTotal}`}
              icon={<Megaphone size={19} className="text-gold-deep" aria-hidden />}
              hint="Pindai nota hari ini"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="status-chart-title">
              <h2 id="status-chart-title" className="text-lg font-bold">
                Warung per status
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Kesehatan tenant platform hari ini.</p>
              <div className="mt-4">
                <BarList rows={statusRows} formatValue={(value) => `${value} warung`} />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="quota-title">
              <h2 id="quota-title" className="text-lg font-bold">
                Kuota AI per warung
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Pemakaian pindai nota harian terhadap batas gratis.</p>
              <div className="mt-4">
                <BarList rows={quotaRows} formatValue={(value) => `${value} scan`} />
              </div>
            </section>
          </div>
        </>
      )}

      {section === "warung" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari warung"
                aria-label="Cari warung"
                className="min-h-12 w-full rounded-xl border border-line bg-sheet pl-10 pr-3 text-sm placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </div>
            <Tabs<TenantFilter>
              label="Filter status warung"
              items={[
                { id: "semua", label: "Semua", count: tenants.length },
                { id: "aktif", label: "Aktif", count: activeCount },
                { id: "ditangguhkan", label: "Ditangguhkan", count: suspendedCount },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>

          {filteredTenants.length ? (
            <ul className="space-y-3">
              {filteredTenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-sheet p-4 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() => setDetail(tenant)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h2 className="truncate text-sm font-bold">{tenant.name}</h2>
                    <p className="mt-1 text-xs text-ink-soft">
                      {tenant.categoryLabel} Â· {tenant.transactionsToday} transaksi hari ini Â· OCR {tenant.aiUsed}/
                      {tenant.aiQuota}
                    </p>
                  </button>
                  <Badge tone={tenant.status === "ACTIVE" ? "healthy" : "critical"}>
                    {tenant.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-12 px-3 text-xs"
                      onClick={() => setDetail(tenant)}
                    >
                      Detail
                    </Button>
                    <Button
                      variant={tenant.status === "ACTIVE" ? "danger" : "secondary"}
                      className="min-h-12 px-3 text-xs"
                      icon={tenant.status === "ACTIVE" ? <Ban size={15} aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}
                      onClick={() => setConfirmTenant(tenant)}
                    >
                      {tenant.status === "ACTIVE" ? "Tangguhkan" : "Aktifkan"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Building2 size={24} aria-hidden />}
              title="Belum ada warung terdaftar."
              description="Coba kata pencarian lain atau ganti filter status."
            />
          )}
        </>
      )}

      {section === "broadcast" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
          <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="composer-title">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gold-soft text-gold-deep">
                <Megaphone size={19} aria-hidden />
              </span>
              <div>
                <h2 id="composer-title" className="font-bold">
                  Pengumuman harga
                </h2>
                <p className="text-xs text-ink-soft">Tampil sebagai banner di layar kasir dan stok warung.</p>
              </div>
            </div>
            <div className="mt-5">
              <Field label="Isi pengumuman" htmlFor="broadcast-text" hint={`${broadcast.length}/180 karakter`}>
                <Textarea
                  id="broadcast-text"
                  rows={4}
                  maxLength={180}
                  value={broadcast}
                  onChange={(event) => setBroadcast(event.target.value)}
                  placeholder="Contoh: Harga telur di pasar naik 25% minggu ini."
                />
              </Field>
            </div>
            <Button
              className="mt-4"
              block
              icon={<Send size={17} aria-hidden />}
              loading={pending.broadcast}
              disabled={!broadcast.trim()}
              onClick={() => void sendMessage()}
            >
              Tayangkan ke warung aktif
            </Button>
          </section>

          <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="broadcast-history">
            <h2 id="broadcast-history" className="font-bold">
              Riwayat pengumuman
            </h2>
            <ul className="mt-4 space-y-3">
              {broadcasts.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-line p-4">
                  <p className="text-sm leading-6 text-ink">{entry.message}</p>
                  <p className="mt-2 text-xs text-ink-soft">Ditayangkan {dateId(entry.createdAt.slice(0, 10))}</p>
                </li>
              ))}
              {!broadcasts.length && (
                <li>
                  <EmptyState
                    title="Belum ada pengumuman."
                    description="Tulis pengumuman harga agar semua warung tahu."
                  />
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {section === "starter" && (
        <section className="rounded-2xl border border-line bg-sheet p-5" aria-labelledby="starter-title">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <PackageCheck size={19} aria-hidden />
            </span>
            <div>
              <h2 id="starter-title" className="font-bold">
                Starter pack
              </h2>
              <p className="text-xs text-ink-soft">Isi awal barang dan batch sesuai jenis usaha.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {templates.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-line p-4">
                <h3 className="text-sm font-bold">{entry.name}</h3>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{entry.description}</p>
                <p className="mt-2 text-xs text-ink-soft">{entry.items.length} jenis barang</p>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => setTemplate(entry)}>
                  Lihat isi paket
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? "Detail warung"}
        description={detail ? `${detail.categoryLabel} Â· pemilik ${detail.ownerName}` : undefined}
        footer={
          detail ? (
            <>
              <Button variant="secondary" block onClick={() => setDetail(null)}>
                Tutup
              </Button>
              <Button
                variant={detail.status === "ACTIVE" ? "danger" : "primary"}
                block
                loading={pending[`tenant-${detail.id}`]}
                onClick={() => setConfirmTenant(detail)}
              >
                {detail.status === "ACTIVE" ? "Tangguhkan warung" : "Aktifkan warung"}
              </Button>
            </>
          ) : null
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-paper p-4">
                <p className="text-xs text-ink-soft">Transaksi hari ini</p>
                <p className="mt-1 text-xl font-extrabold tabular">{numberId(detail.transactionsToday)}</p>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <p className="text-xs text-ink-soft">Kuota OCR</p>
                <p className="mt-1 text-xl font-extrabold tabular">
                  {detail.aiUsed}/{detail.aiQuota}
                </p>
              </div>
            </div>
            <dl className="space-y-2 rounded-xl border border-line p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Status</dt>
                <dd>
                  <Badge tone={detail.status === "ACTIVE" ? "healthy" : "critical"}>
                    {detail.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Jenis usaha</dt>
                <dd className="font-semibold">{detail.categoryLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Bergabung</dt>
                <dd className="font-semibold">{dateId(detail.joinedAt)}</dd>
              </div>
            </dl>
            {detail.status === "SUSPENDED" && (
              <p className="flex items-start gap-2 rounded-xl bg-critical-soft p-3 text-sm leading-5 text-critical">
                <ShieldAlert size={17} className="mt-0.5 shrink-0" aria-hidden />
                Penjaga warung ini tidak bisa membuka kasir sampai status aktif kembali.
              </p>
            )}
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(template)}
        onClose={() => setTemplate(null)}
        title={template ? `Paket ${template.name}` : "Starter pack"}
        description={template?.description}
        footer={
          <>
            <Button variant="secondary" block onClick={() => setTemplate(null)}>
              Batal
            </Button>
            <Button
              block
              loading={pending.template}
              onClick={() => template && void applyPack(template)}
            >
              Terapkan ke warung aktif
            </Button>
          </>
        }
      >
        {template && (
          <ul className="divide-y divide-line">
            {template.items.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <b className="block text-sm">{entry.name}</b>
                  <small className="mt-1 block text-xs text-ink-soft">
                    1 {entry.purchaseUnit} isi {numberId(entry.conversionRate)} {entry.baseUnit} Â· modal{" "}
                    {numberId(entry.unitCost)}/{entry.baseUnit}
                  </small>
                </span>
                <Badge tone="neutral">Min {numberId(entry.minStock)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={Boolean(confirmTenant)}
        onClose={() => setConfirmTenant(null)}
        title={confirmTenant?.status === "ACTIVE" ? "Tangguhkan warung?" : "Aktifkan warung?"}
        footer={
          <>
            <Button variant="secondary" block onClick={() => setConfirmTenant(null)}>
              Batal
            </Button>
            <Button
              variant={confirmTenant?.status === "ACTIVE" ? "danger" : "primary"}
              block
              loading={confirmTenant ? pending[`tenant-${confirmTenant.id}`] : false}
              onClick={() => {
                if (!confirmTenant) return;
                const target = confirmTenant;
                setConfirmTenant(null);
                void toggleTenant(target);
              }}
            >
              {confirmTenant?.status === "ACTIVE" ? "Ya, tangguhkan" : "Ya, aktifkan"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          {confirmTenant?.status === "ACTIVE"
            ? `${confirmTenant.name} tidak bisa membuka kasir sampai status aktif kembali. Data warung tetap aman.`
            : `${confirmTenant?.name} akan bisa membuka kasir lagi dan menerima pengumuman platform.`}
        </p>
      </Sheet>
    </AdminShell>
  );
}

