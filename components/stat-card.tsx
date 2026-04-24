import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  accent = "default"
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "default" | "pine" | "rose";
}) {
  return (
    <article
      className={cn(
        "rounded-[14px] border border-black/8 bg-white/78 p-5 shadow-soft backdrop-blur",
        accent === "pine" && "border-pine/20 bg-pine/[0.08]",
        accent === "rose" && "border-rose/15 bg-rose/[0.07]"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">{label}</p>
      <p className="mt-3 font-serif text-4xl text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink/65">{hint}</p>
    </article>
  );
}
