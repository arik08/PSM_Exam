import Link from "next/link";

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
      className="group rounded-[28px] border border-black/8 bg-white/78 p-4 shadow-soft transition hover:-translate-y-1 hover:border-pine/25 hover:bg-white sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{badge}</p>
      <h2 className="mt-2 font-serif text-2xl text-ink sm:text-[1.8rem]">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink/65">{body}</p>
    </Link>
  );
}
