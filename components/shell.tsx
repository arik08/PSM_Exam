import Link from "next/link";
import { fetchProgress } from "@/lib/api";
import { cn } from "@/lib/utils";

type ShellProps = {
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
};

export async function Shell({ title, eyebrow, description, children, actions, compact = false }: ShellProps) {
  const progress = await fetchProgress();
  const resumeMode =
    progress.preferences.lastMode === "review" || progress.preferences.lastMode === "all"
      ? "speaking"
      : progress.preferences.lastMode;
  const resumeHref = progress.resumeQuestionId
    ? `/study?mode=${resumeMode}&resume=1`
    : "/study?mode=speaking";

  return (
    <div className="min-h-screen bg-grain">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f8fbff]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-3">
          <div className="min-w-0">
            <Link href="/" className="block whitespace-nowrap font-serif text-base text-ink sm:text-2xl">
              OPIc English Coach
            </Link>
          </div>
          <nav className="flex flex-nowrap items-center gap-1 text-[11px] sm:gap-2 sm:text-sm">
            <NavLink href="/">홈</NavLink>
            <NavLink href={resumeHref}>이어풀기</NavLink>
            <NavLink href="/stats">통계</NavLink>
          </nav>
        </div>
      </header>

      <main className={cn("mx-auto max-w-6xl px-4 pb-24 sm:px-6", compact ? "pt-4 sm:pt-5" : "pt-8 sm:pt-10")}>
        <div
          className={cn(
            "flex flex-col gap-4 sm:flex-row sm:justify-between",
            compact ? "mb-4 sm:items-center" : "mb-8 sm:items-end"
          )}
        >
          <div className="max-w-3xl">
            <p className={cn("text-xs font-semibold uppercase tracking-[0.28em] text-gold", compact && "mb-1")}>
              {eyebrow}
            </p>
            <h1 className={cn("font-serif leading-tight text-ink", compact ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl")}>
              {title}
            </h1>
            {description ? (
              <p className={cn("text-ink/70", compact ? "mt-2 text-sm leading-6" : "mt-3 text-sm leading-7 sm:text-base")}>
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="sm:pb-1">{actions}</div> : null}
        </div>

        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-[12px] border border-black/10 px-2.5 py-1.5 text-ink/70 transition hover:border-pine/30 hover:text-pine sm:px-3 sm:py-2"
      )}
    >
      {children}
    </Link>
  );
}
