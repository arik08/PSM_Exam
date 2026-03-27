import clsx from "clsx";

export function cn(...inputs: Array<string | undefined | false | null>) {
  return clsx(inputs);
}

export function toPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatKoreanDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
