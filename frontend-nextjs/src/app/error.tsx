"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-sheet p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <TriangleAlert size={22} aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">Halaman belum selesai dimuat.</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Data contoh belum siap. Muat ulang layar ini, langkahmu sebelumnya tidak tersimpan.
        </p>
        <Button className="mt-5" icon={<RotateCcw size={17} aria-hidden />} onClick={reset}>
          Muat ulang
        </Button>
      </div>
    </main>
  );
}
