"use client";

import { Megaphone, X } from "lucide-react";
import { useWarung } from "@/lib/warung-store";

export function BroadcastBanner() {
  const { snapshot, dismissedBroadcasts, dismissBroadcast } = useWarung();
  const broadcast = snapshot.broadcasts.find((entry) => !dismissedBroadcasts.includes(entry.id));

  if (!broadcast) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3">
      <Megaphone size={19} className="mt-0.5 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-6 text-warning">{broadcast.message}</p>
      <button
        type="button"
        onClick={() => dismissBroadcast(broadcast.id)}
        aria-label="Tutup pengumuman"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-warning transition hover:bg-white/70"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
