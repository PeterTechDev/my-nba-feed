export default function DataError({ subject, retry }: { subject: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-white/10 bg-[#161616] p-6">
      <p className="font-medium">Unable to load {subject}</p>
      <p className="mt-2 text-sm text-white/70">The data service is unavailable. Try again in a moment.</p>
      <button type="button" onClick={retry} className="mt-4 min-h-11 rounded-lg bg-white/10 px-4 text-sm font-medium hover:bg-white/20">
        Try again
      </button>
    </div>
  );
}
