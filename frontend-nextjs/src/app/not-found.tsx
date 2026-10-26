import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-sheet p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Compass size={22} aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">Halaman ini tidak ada.</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Mungkin tautannya salah. Kembali ke layar kasir untuk lanjut jualan.
        </p>
        <Link
          href="/app/pos"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover"
        >
          Buka kasir
        </Link>
      </div>
    </main>
  );
}
