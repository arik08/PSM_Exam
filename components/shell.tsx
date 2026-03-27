import Link from "next/link";
import { cn } from "@/lib/utils";

type ShellProps = {
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
};

export function Shell({ title, eyebrow, description, children, actions, compact = false }: ShellProps) {
  return (
    <div className="min-h-screen bg-grain">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f8fbff]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/70">
              {eyebrow}
            </p>
            <Link href="/" className="font-serif text-xl text-ink sm:text-2xl">
              PSM Study
            </Link>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink href="/">홈</NavLink>
            <NavLink href="/study?mode=all">문제 풀이</NavLink>
            <NavLink href="/study?mode=review">오답 복습</NavLink>
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
        "rounded-full border border-black/10 px-3 py-2 text-ink/70 transition hover:border-pine/30 hover:text-pine"
      )}
    >
      {children}
    </Link>
  );
}
