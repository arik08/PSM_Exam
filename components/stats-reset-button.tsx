"use client";

import { useState } from "react";
import { ReviewFilter, StudyMode } from "@/lib/types";

type ResetButtonProps = {
  compact?: boolean;
  endpoint?: string;
  label?: string;
  pendingLabel?: string;
  errorMessage?: string;
  body?: Record<string, unknown>;
  tone?: "danger" | "subtle";
};

export function StatsResetButton() {
  return <ResetButton />;
}

export function WrongQuestionsResetButton() {
  return (
    <ResetButton
      endpoint="/api/reset-wrong-questions"
      label="복습 목록 초기화"
      pendingLabel="복습 목록 초기화 중..."
      errorMessage="복습 목록 초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
      tone="subtle"
    />
  );
}

export function HiddenQuestionsResetButton() {
  return (
    <ResetButton
      endpoint="/api/reset-hidden-questions"
      label="숨김 초기화"
      pendingLabel="숨김 초기화 중..."
      errorMessage="숨김 초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
      tone="subtle"
    />
  );
}

export function StudyResetButtons({
  mode,
  reviewFilter,
  compact = false
}: {
  mode: StudyMode;
  reviewFilter: ReviewFilter;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ResetButton
        compact={compact}
        label="전체 초기화"
        pendingLabel="전체 초기화 중..."
        errorMessage="전체 초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
      />
      <ResetButton
        compact={compact}
        endpoint="/api/reset-mode-progress"
        label="부분 초기화"
        pendingLabel="부분 초기화 중..."
        errorMessage="부분 초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
        body={{ mode, review: reviewFilter }}
        tone="subtle"
      />
    </div>
  );
}

export function ResetButton({
  compact = false,
  endpoint = "/api/reset-progress",
  label = "전체 초기화",
  pendingLabel = "초기화 중...",
  errorMessage = "초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.",
  body,
  tone = "danger"
}: ResetButtonProps = {}) {
  const [isPending, setIsPending] = useState(false);

  async function handleReset() {
    setIsPending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error("reset_failed");
      }

      window.location.reload();
    } catch {
      window.alert(errorMessage);
      setIsPending(false);
    }
  }

  const sizeClass = compact
    ? "w-full rounded-[10px] px-4 py-2.5 text-sm"
    : "rounded-[12px] px-4 py-2 text-sm";
  const toneClass =
    tone === "danger"
      ? "border border-rose/20 bg-rose/12 text-rose hover:bg-rose/18"
      : "border border-black/10 bg-white text-ink/62 hover:border-pine/25 hover:text-pine";

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isPending}
      className={`${sizeClass} ${toneClass} font-medium transition disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
