"use client";

import { useState } from "react";

type ResetButtonProps = {
  compact?: boolean;
  endpoint?: string;
  label?: string;
  pendingLabel?: string;
  confirmMessage?: string;
  errorMessage?: string;
};

export function StatsResetButton() {
  return <ResetButton />;
}

export function WrongQuestionsResetButton() {
  return (
    <ResetButton
      endpoint="/api/reset-wrong-questions"
      label="오답 기록 초기화"
      pendingLabel="오답 기록 초기화 중..."
      confirmMessage="오답 문제 목록만 초기화할까요? 전체 제출 기록과 정확도는 유지됩니다."
      errorMessage="오답 기록 초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
    />
  );
}

export function ResetButton({
  compact = false,
  endpoint = "/api/reset-progress",
  label = "학습 기록 초기화",
  pendingLabel = "초기화 중...",
  confirmMessage = "학습 기록을 초기화할까요? 제출 기록, 오답 목록, 이어풀기 정보가 지워집니다.",
  errorMessage = "초기화 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
}: ResetButtonProps = {}) {
  const [isPending, setIsPending] = useState(false);

  async function handleReset() {
    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) {
        throw new Error("reset_failed");
      }

      window.location.reload();
    } catch {
      window.alert(errorMessage);
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isPending}
      className={
        compact
          ? "w-full rounded-2xl border border-rose/20 bg-rose/12 px-4 py-2.5 text-sm font-medium text-rose transition hover:bg-rose/18 disabled:cursor-not-allowed disabled:opacity-60"
          : "rounded-full border border-rose/20 bg-rose/12 px-4 py-2 text-sm font-medium text-rose transition hover:bg-rose/18 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
