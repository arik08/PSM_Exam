"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ResetButton } from "@/components/stats-reset-button";
import {
  AttemptResult,
  OrderMode,
  ProgressSummary,
  QuestionApiResponse,
  Question,
  ReviewFilter,
  StudyPayload,
  StudyMode
} from "@/lib/types";
import { cn, formatKoreanDate, toPercent } from "@/lib/utils";

type StudyClientProps = {
  initialData: QuestionApiResponse;
  initialProgress: ProgressSummary;
  initialMode: StudyMode;
  initialReviewFilter: ReviewFilter;
  initialOrder: OrderMode;
  initialOrderSeed: string;
  resume: boolean;
};

type SubmissionState = {
  submitted: boolean;
  isCorrect: boolean;
  correctLabel: string | null;
  correctText: string;
  submittedAt: string | null;
};

type FeedbackState = "correct" | "wrong" | null;

type QuestionViewState = {
  selectedLabel: string | null;
  submission: SubmissionState;
  showSolution: boolean;
};

function createEmptySubmission(): SubmissionState {
  return {
    submitted: false,
    isCorrect: false,
    correctLabel: null,
    correctText: "",
    submittedAt: null
  };
}

function isSameSubmission(left: SubmissionState, right: SubmissionState) {
  return (
    left.submitted === right.submitted &&
    left.isCorrect === right.isCorrect &&
    left.correctLabel === right.correctLabel &&
    left.correctText === right.correctText &&
    left.submittedAt === right.submittedAt
  );
}

export function StudyClient({
  initialData,
  initialProgress,
  initialMode,
  initialReviewFilter,
  initialOrder,
  initialOrderSeed,
  resume
}: StudyClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [baseData, setBaseData] = useState(initialData);
  const [orderSeed, setOrderSeed] = useState(initialOrderSeed);
  const [data, setData] = useState(() => applyOrder(initialData, initialOrder, initialOrderSeed));
  const [progress, setProgress] = useState(initialProgress);
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(initialReviewFilter);
  const [orderMode, setOrderMode] = useState<OrderMode>(initialOrder);
  const [index, setIndex] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionState>(createEmptySubmission);
  const [showSolution, setShowSolution] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionStateMap, setQuestionStateMap] = useState<Record<string, QuestionViewState>>({});
  const questionStateMapRef = useRef(questionStateMap);

  const currentQuestion = data.questions[index] ?? null;
  const currentQuestionId = currentQuestion?.id ?? null;

  useEffect(() => {
    questionStateMapRef.current = questionStateMap;
  }, [questionStateMap]);

  useEffect(() => {
    if (!resume || !progress.resumeQuestionId) {
      return;
    }

    const found = data.questions.findIndex((question) => question.id === progress.resumeQuestionId);
    if (found >= 0) {
      setIndex(found);
    }
  }, [data.questions, progress.resumeQuestionId, resume]);

  useEffect(() => {
    if (!currentQuestionId) {
      return;
    }

    const savedQuestionState = questionStateMapRef.current[currentQuestionId];
    setSelectedLabel(savedQuestionState?.selectedLabel ?? null);
    setSubmission(savedQuestionState?.submission ?? createEmptySubmission());
    setShowSolution(savedQuestionState?.showSolution ?? false);
    setFeedbackState(null);
    setError(null);
  }, [currentQuestionId]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    setQuestionStateMap((current) => {
      const previousState = current[currentQuestion.id];

      if (
        previousState &&
        previousState.selectedLabel === selectedLabel &&
        previousState.showSolution === showSolution &&
        isSameSubmission(previousState.submission, submission)
      ) {
        return current;
      }

      return {
        ...current,
        [currentQuestion.id]: {
          selectedLabel,
          submission,
          showSolution
        }
      };
    });
  }, [currentQuestion, selectedLabel, submission, showSolution]);

  useEffect(() => {
    if (!feedbackState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedbackState(null);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [feedbackState]);

  const solvedCountInCurrentMode = useMemo(() => {
    const solvedSet = new Set(progress.solvedQuestionIds);
    return data.questions.filter((question) => solvedSet.has(question.id)).length;
  }, [data.questions, progress.solvedQuestionIds]);

  const progressValue = useMemo(() => {
    if (!data.total) return 0;
    return (solvedCountInCurrentMode / data.total) * 100;
  }, [data.total, solvedCountInCurrentMode]);

  const canGoNext =
    submission.submitted &&
    (index < data.questions.length - 1 || (mode === "review" && reviewFilter !== "recent"));

  const actionHint = !selectedLabel
    ? "보기를 하나 선택한 뒤 정답 및 해설 카드를 누르세요."
    : !submission.submitted
      ? "정답 및 해설 카드를 누르면 제출됩니다."
      : "정답 및 해설 카드를 한 번 더 누르면 다음 문제로 넘어갑니다.";

  function buildStudyQuery(
    nextMode: StudyMode,
    nextFilter: ReviewFilter,
    nextOrder: OrderMode,
    nextOrderSeed: string
  ) {
    const query = new URLSearchParams();
    query.set("mode", nextMode);
    if (nextMode === "review") {
      query.set("review", nextFilter);
    }
    query.set("order", nextOrder);
    if (nextOrder === "random") {
      query.set("orderSeed", nextOrderSeed);
    }
    return query;
  }

  async function loadMode(
    nextMode: StudyMode,
    nextFilter: ReviewFilter = reviewFilter,
    nextOrder: OrderMode = orderMode,
    nextOrderSeed: string = orderSeed
  ) {
    startTransition(async () => {
      const query = buildStudyQuery(nextMode, nextFilter, nextOrder, nextOrderSeed);

      const response = await fetch(`/api/questions?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as StudyPayload;
      const nextData = payload.questionPayload;
      const nextProgress = payload.progress;

      setMode(nextMode);
      setReviewFilter(nextFilter);
      setOrderMode(nextOrder);
      setOrderSeed(nextOrderSeed);
      setBaseData(nextData);
      setData(applyOrder(nextData, nextOrder, nextOrderSeed));
      setProgress(nextProgress);
      setIndex(0);
      router.replace(`/study?${query.toString()}`);
    });
  }

  function handleOrderChange(nextOrder: OrderMode) {
    const currentQuestionId = currentQuestion?.id ?? null;
    const nextOrderSeed = nextOrder === "random" ? `${Date.now()}-${Math.random().toString(16).slice(2)}` : orderSeed;
    const nextData = applyOrder(baseData, nextOrder, nextOrderSeed);
    const nextIndex =
      currentQuestionId
        ? nextData.questions.findIndex((question) => question.id === currentQuestionId)
        : -1;

    setOrderMode(nextOrder);
    setOrderSeed(nextOrderSeed);
    setData(nextData);
    setIndex(nextIndex >= 0 ? nextIndex : 0);
    const query = buildStudyQuery(mode, reviewFilter, nextOrder, nextOrderSeed);
    router.replace(`/study?${query.toString()}`);
  }

  async function handleSubmit() {
    if (!currentQuestion || !selectedLabel || submission.submitted) {
      return;
    }

    setError(null);

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedLabel,
          mode
        })
      });

      if (!response.ok) {
        throw new Error("submit_failed");
      }

      const result = (await response.json()) as AttemptResult;

      setSubmission({
        submitted: true,
        isCorrect: result.isCorrect,
        correctLabel: result.correctLabel,
        correctText: result.correctText,
        submittedAt: new Date().toISOString()
      });
      setShowSolution(true);
      setFeedbackState(result.isCorrect ? "correct" : "wrong");
      playFeedbackSound(result.isCorrect ? "correct" : "wrong");

      setProgress(result.progress);
    } catch {
      setError("저장 중 문제가 생겼습니다. 다시 제출해 주세요.");
    }
  }

  async function handleNext() {
    if (index < data.questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    if (mode === "review" && reviewFilter !== "recent") {
      await loadMode("review", reviewFilter);
      return;
    }

    setIndex(0);
  }

  function handlePrevious() {
    if (index <= 0) {
      return;
    }

    setIndex((current) => current - 1);
  }

  async function handleSolutionAction() {
    if (!selectedLabel && !submission.submitted) {
      return;
    }

    if (!submission.submitted) {
      await handleSubmit();
      return;
    }

    await handleNext();
  }

  function handleModeSelect(nextMode: StudyMode) {
    setMobilePanelOpen(false);
    void loadMode(nextMode);
  }

  function handleReviewFilterSelect(nextFilter: ReviewFilter) {
    setMobilePanelOpen(false);
    void loadMode("review", nextFilter);
  }

  function handleOrderSelect(nextOrder: OrderMode) {
    setMobilePanelOpen(false);
    handleOrderChange(nextOrder);
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-[28px] border border-black/8 bg-white/80 p-8 text-center shadow-soft">
        <p className="font-serif text-3xl text-ink">표시할 문제가 없습니다.</p>
        <p className="mt-3 text-sm text-ink/65">오답 복습 목록이 비어 있거나 조건에 맞는 문항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.82fr_1.48fr]">
      <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block lg:self-start">
        <SidebarContent
          mode={mode}
          reviewFilter={reviewFilter}
          orderMode={orderMode}
          progress={progress}
          index={index}
          total={data.total}
          solvedCount={solvedCountInCurrentMode}
          progressValue={progressValue}
          onModeSelect={handleModeSelect}
          onReviewFilterSelect={handleReviewFilterSelect}
          onOrderSelect={handleOrderSelect}
        />
      </aside>

      <section
        className={cn(
          "relative rounded-[28px] border border-black/8 bg-white/80 p-4 shadow-soft sm:p-5",
          feedbackState === "correct" && "feedback-shell-correct",
          feedbackState === "wrong" && "feedback-shell-wrong"
        )}
      >
        {feedbackState ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[28px]",
              feedbackState === "correct" ? "feedback-flash-correct" : "feedback-flash-wrong"
            )}
          />
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2 text-xs text-ink/62">
            <span className="rounded-full border border-black/10 px-2.5 py-1">{modeLabel(mode)}</span>
            <span>{index + 1} / {data.total}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobilePanelOpen(true)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/75"
          >
            설정
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink/70">
            {currentQuestion.sourceSection}
          </span>
          {currentQuestion.isPastExam ? (
            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              기출
            </span>
          ) : (
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink/55">
              일반
            </span>
          )}
        </div>

        <h2 className="mt-3 font-serif text-2xl leading-snug text-ink sm:text-[2rem]">
          {currentQuestion.prompt || `문제 ${currentQuestion.number}`}
        </h2>

        {currentQuestion.context ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/72">
            {currentQuestion.context}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          {currentQuestion.choices.map((choice) => {
            const isSelected = selectedLabel === choice.label;
            const isCorrect = submission.correctLabel === choice.label;
            const isWrongSelection =
              submission.submitted && isSelected && !submission.isCorrect;

            return (
              <button
                key={choice.label}
                type="button"
                disabled={submission.submitted}
                onClick={() => setSelectedLabel(choice.label)}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 rounded-[20px] border px-3.5 py-2.5 text-left transition-all duration-150",
                  "border-black/10 bg-[#f8fbff] hover:border-pine/25 hover:bg-[#edf5fd] active:translate-y-px active:shadow-[inset_0_2px_8px_rgba(16,35,63,0.14)]",
                  isSelected &&
                    "border-pine bg-[#dcecff] shadow-[inset_0_2px_10px_rgba(0,91,170,0.18)] ring-1 ring-pine/12",
                  submission.submitted && isCorrect &&
                    "border-pine bg-[#d3e8ff] shadow-[inset_0_2px_10px_rgba(0,91,170,0.18)]",
                  submission.submitted && isWrongSelection &&
                    "border-rose bg-[#f7dbe2] shadow-[inset_0_2px_10px_rgba(181,80,102,0.14)]"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 font-semibold text-pine",
                    submission.submitted && isWrongSelection && "text-rose"
                  )}
                >
                  {choice.label}
                </span>
                <span className="text-sm leading-5 text-ink">{choice.text}</span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-3 rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        ) : null}

        <div className="mt-4">
          <RevealCard
            label="정답 및 해설"
            value={
              submission.submitted ? (
                <div className="space-y-2">
                  <div>
                    정답: <strong>{currentQuestion.answer.label}</strong> {currentQuestion.answer.text}
                  </div>
                  <div>{currentQuestion.explanation}</div>
                </div>
              ) : (
                "제출 후 확인"
              )
            }
            enabled={showSolution}
            disabled={!selectedLabel && !submission.submitted}
            readyText="눌러서 다음 문제"
            idleText={selectedLabel ? "눌러서 제출" : "선택 후 확인"}
            onToggle={() => void handleSolutionAction()}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <SecondaryAction onClick={handlePrevious} disabled={index === 0}>
            이전 문제
          </SecondaryAction>
          <SecondaryAction
            onClick={() => void handleNext()}
            disabled={!canGoNext}
          >
            다음 문제
          </SecondaryAction>
        </div>

        <div className="mt-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-2.5 text-sm text-ink/68">
          {actionHint}
        </div>

        <div className="hidden">
          <p className="text-xs text-ink/55">
            마지막 학습 모드: {progress.preferences.lastMode}
            {progress.resumeQuestionId ? ` / 이어풀기 ID: ${progress.resumeQuestionId}` : ""}
          </p>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/8 bg-[#f8fbff]/96 px-4 py-3 shadow-[0_-12px_30px_rgba(16,35,63,.08)] backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-2xl gap-2">
            <div className="grid grid-cols-2 gap-2">
              <SecondaryAction onClick={handlePrevious} disabled={index === 0}>
                이전 문제
              </SecondaryAction>
              <SecondaryAction
                onClick={() => void handleNext()}
                disabled={!canGoNext}
              >
                다음 문제
              </SecondaryAction>
            </div>
            <MobileAction onClick={() => void handleSolutionAction()} disabled={!selectedLabel && !submission.submitted}>
              {submission.submitted ? "정답 및 해설 / 다음" : "정답 및 해설"}
            </MobileAction>
          </div>
        </div>

        <div className="hidden">
          {isPending ? "목록을 불러오는 중..." : "최근 저장은 서버 응답 기준으로 즉시 반영됩니다."}
          {submission.submittedAt ? (
            <span className="ml-2">제출 시간: {formatKoreanDate(submission.submittedAt)}</span>
          ) : null}
        </div>
      </section>

      {mobilePanelOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobilePanelOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[28px] bg-[#f8fbff] p-4 pb-28 shadow-[0_-18px_40px_rgba(16,35,63,.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Settings</p>
                <p className="mt-1 font-serif text-xl text-ink">학습 설정</p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-ink/70"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3">
              <SidebarContent
                mode={mode}
                reviewFilter={reviewFilter}
                orderMode={orderMode}
                progress={progress}
                index={index}
                total={data.total}
                solvedCount={solvedCountInCurrentMode}
                progressValue={progressValue}
                onModeSelect={handleModeSelect}
                onReviewFilterSelect={handleReviewFilterSelect}
                onOrderSelect={handleOrderSelect}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function modeLabel(mode: StudyMode) {
  if (mode === "past") return "기출";
  if (mode === "review") return "오답";
  return "전체";
}

function playFeedbackSound(type: Exclude<FeedbackState, null>) {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);

    if (type === "correct") {
      const first = context.createOscillator();
      const second = context.createOscillator();

      first.type = "triangle";
      second.type = "sine";
      first.frequency.setValueAtTime(520, now);
      second.frequency.setValueAtTime(780, now + 0.06);

      first.connect(gain);
      second.connect(gain);

      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      first.start(now);
      first.stop(now + 0.16);
      second.start(now + 0.06);
      second.stop(now + 0.34);
    } else {
      const low = context.createOscillator();
      const hit = context.createOscillator();

      low.type = "sawtooth";
      hit.type = "triangle";
      low.frequency.setValueAtTime(210, now);
      hit.frequency.setValueAtTime(165, now + 0.08);

      low.connect(gain);
      hit.connect(gain);

      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      low.start(now);
      low.stop(now + 0.14);
      hit.start(now + 0.08);
      hit.stop(now + 0.3);
    }

    window.setTimeout(() => {
      void context.close().catch(() => undefined);
    }, 400);
  } catch {
    // Ignore audio playback failures; visual feedback still appears.
  }
}

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1;

  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleQuestions(questions: Question[], seed: string) {
  const next = [...questions];
  const random = createSeededRandom(seed);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

function applyOrder(payload: QuestionApiResponse, orderMode: OrderMode, seed: string): QuestionApiResponse {
  if (orderMode === "sequential") {
    return {
      ...payload,
      questions: [...payload.questions]
    };
  }

  return {
    ...payload,
    questions: shuffleQuestions(payload.questions, seed)
  };
}

function SidebarContent({
  mode,
  reviewFilter,
  orderMode,
  progress,
  index,
  total,
  solvedCount,
  progressValue,
  onModeSelect,
  onReviewFilterSelect,
  onOrderSelect
}: {
  mode: StudyMode;
  reviewFilter: ReviewFilter;
  orderMode: OrderMode;
  progress: ProgressSummary;
  index: number;
  total: number;
  solvedCount: number;
  progressValue: number;
  onModeSelect: (mode: StudyMode) => void;
  onReviewFilterSelect: (filter: ReviewFilter) => void;
  onOrderSelect: (orderMode: OrderMode) => void;
}) {
  return (
    <>
      <section className="rounded-[24px] border border-black/8 bg-white/80 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Mode</p>
        <div className="mt-3 grid gap-2">
          <ModeButton active={mode === "all"} onClick={() => onModeSelect("all")}>
            전체 문제
          </ModeButton>
          <ModeButton active={mode === "past"} onClick={() => onModeSelect("past")}>
            기출만 보기
          </ModeButton>
          <ModeButton active={mode === "review"} onClick={() => onModeSelect("review")}>
            오답 복습
          </ModeButton>
        </div>

        {mode === "review" ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniButton active={reviewFilter === "active"} onClick={() => onReviewFilterSelect("active")}>
              전체 오답
            </MiniButton>
            <MiniButton active={reviewFilter === "recent"} onClick={() => onReviewFilterSelect("recent")}>
              최근 오답
            </MiniButton>
            <MiniButton active={reviewFilter === "past-only"} onClick={() => onReviewFilterSelect("past-only")}>
              기출 오답
            </MiniButton>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white/80 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Order</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniButton active={orderMode === "sequential"} onClick={() => onOrderSelect("sequential")}>
            순서대로
          </MiniButton>
          <MiniButton active={orderMode === "random"} onClick={() => onOrderSelect("random")}>
            랜덤
          </MiniButton>
        </div>
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white/80 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Progress</p>
            <p className="mt-1 font-serif text-2xl text-ink">
              {solvedCount} / {total}
            </p>
          </div>
          <span className="rounded-full border border-pine/15 bg-pine/10 px-3 py-1 text-xs font-medium text-pine">
            {mode.toUpperCase()}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist">
          <div className="h-full rounded-full bg-pine transition-all duration-300" style={{ width: `${progressValue}%` }} />
        </div>

        <dl className="mt-3 grid gap-2 text-xs text-ink/70 sm:text-sm">
          <div className="flex items-center justify-between">
            <dt>누적 정답률</dt>
            <dd className="font-medium text-ink">{toPercent(progress.accuracy)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>현재 위치</dt>
            <dd className="font-medium text-ink">{index + 1}번</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>active 오답</dt>
            <dd className="font-medium text-ink">{progress.activeReviewCount}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <ResetButton compact />
        </div>
      </section>
    </>
  );
}

function ModeButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left text-sm transition",
        active
          ? "border-pine bg-pine/[0.09] text-pine"
          : "border-black/8 bg-sand/45 text-ink/70 hover:border-pine/18 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}

function MiniButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-pine text-white" : "bg-black/5 text-ink/65 hover:bg-pine/10 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}

function RevealCard({
  label,
  value,
  enabled,
  disabled,
  idleText = "터치해서 보기",
  readyText = "열림",
  onToggle
}: {
  label: string;
  value: React.ReactNode;
  enabled: boolean;
  disabled: boolean;
  idleText?: string;
  readyText?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "min-h-20 w-full rounded-[20px] border px-4 py-3.5 text-left transition",
        "bg-sand/60",
        enabled ? "border-pine/20 bg-pine/[0.08]" : "border-black/8",
        disabled && "cursor-not-allowed border-dashed opacity-55"
      )}
      >
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-ink">{label}</p>
        <span className="text-[11px] text-ink/45">{enabled ? readyText : "닫힘"}</span>
      </div>
      <div className={cn("mt-2 text-sm leading-6 text-ink/72", !enabled && "line-clamp-1")}>
        {enabled ? value : idleText}
      </div>
    </button>
  );
}

function MobileAction({
  onClick,
  disabled,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
        disabled ? "border-dashed border-black/10 bg-black/5 text-ink/35" : "border-pine bg-pine text-white"
      )}
    >
      {children}
    </button>
  );
}

function SecondaryAction({
  onClick,
  disabled,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
        disabled
          ? "border-dashed border-black/10 bg-black/5 text-ink/35"
          : "border-black/10 bg-white text-ink/75 hover:border-pine/30 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}
