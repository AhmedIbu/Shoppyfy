export default function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-2 border-outline-variant border-t-primary rounded-pill animate-spin" />
      <p className="text-label-md uppercase text-on-surface-variant">{label}</p>
    </div>
  );
}
