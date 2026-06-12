export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-divider" />
      <span className="inter text-[10px] tracking-[3px] uppercase text-muted whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-divider" />
    </div>
  );
}
