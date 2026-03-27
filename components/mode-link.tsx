import Link from "next/link";
import { ArrowRight } from "@/components/primitives";

export function ModeLink({
  href,
  title,
  body,
  badge
}: {
  href: string;
  title: string;
  body: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col justify-between rounded-[32px] border border-black/8 bg-white/78 p-6 shadow-soft transition hover:-translate-y-1 hover:border-pine/25 hover:bg-white"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{badge}</p>
        <h2 className="mt-3 font-serif text-3xl text-ink">{title}</h2>
        <p className="mt-3 max-w-sm text-sm leading-7 text-ink/65">{body}</p>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-pine">
        시작하기
        <ArrowRight className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
