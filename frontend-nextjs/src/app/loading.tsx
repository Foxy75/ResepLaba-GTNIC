export default function Loading() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-line/70" />
        <div className="mt-3 h-4 w-72 rounded-xl bg-line/50" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-line/50" />
          ))}
        </div>
      </div>
    </main>
  );
}
