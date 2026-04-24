"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StudyResetButtons } from "@/components/stats-reset-button";
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

type QueuedAttempt = {
  questionId: string;
  selectedLabel: string;
  mode: StudyMode;
};

const ATTEMPT_QUEUE_KEY = "opic-pending-attempts";

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

function readQueuedAttempts(): QueuedAttempt[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ATTEMPT_QUEUE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as QueuedAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueuedAttempts(queue: QueuedAttempt[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (!queue.length) {
    window.localStorage.removeItem(ATTEMPT_QUEUE_KEY);
    return;
  }

  window.localStorage.setItem(ATTEMPT_QUEUE_KEY, JSON.stringify(queue));
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
  const [timerCentiseconds, setTimerCentiseconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionStateMap, setQuestionStateMap] = useState<Record<string, QuestionViewState>>({});
  const [syncPending, setSyncPending] = useState(false);
  const questionStateMapRef = useRef(questionStateMap);
  const flushInFlightRef = useRef(false);

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
    setTimerCentiseconds(0);
    setTimerRunning(false);
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
    if (!timerRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerCentiseconds((current) => current + 1);
    }, 10);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!feedbackState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedbackState(null);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [feedbackState]);

  useEffect(() => {
    let cancelled = false;

    async function flushQueuedAttempts() {
      if (flushInFlightRef.current) {
        return;
      }

      const queue = readQueuedAttempts();
      if (!queue.length) {
        if (!cancelled) {
          setSyncPending(false);
          setError(null);
        }
        return;
      }

      flushInFlightRef.current = true;
      if (!cancelled) {
        setSyncPending(true);
      }

      const remaining: QueuedAttempt[] = [];

      for (const attempt of queue) {
        try {
          const response = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attempt),
            keepalive: true
          });

          if (!response.ok) {
            remaining.push(attempt);
          }
        } catch {
          remaining.push(attempt);
        }
      }

      writeQueuedAttempts(remaining);
      flushInFlightRef.current = false;

      if (!cancelled) {
        setSyncPending(remaining.length > 0);
        setError(remaining.length > 0 ? "일부 연습 기록을 다시 저장 중입니다." : null);
      }
    }

    void flushQueuedAttempts();

    function handleOnline() {
      void flushQueuedAttempts();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleOnline);
    };
  }, []);

  const solvedCountInCurrentMode = useMemo(() => {
    const solvedSet = new Set(progress.solvedQuestionIds);
    return data.questions.filter((question) => solvedSet.has(question.id)).length;
  }, [data.questions, progress.solvedQuestionIds]);

  const progressValue = useMemo(() => {
    if (!data.total) return 0;
    return (solvedCountInCurrentMode / data.total) * 100;
  }, [data.total, solvedCountInCurrentMode]);

  const canGoNext =
    index < data.questions.length - 1 || (mode === "review" && reviewFilter !== "recent");

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

  function updateProgressOptimistically(result: AttemptResult) {
    setProgress((current) => {
      const solvedQuestionIds = current.solvedQuestionIds.includes(result.questionId)
        ? current.solvedQuestionIds
        : [...current.solvedQuestionIds, result.questionId];
      const totalSolved = solvedQuestionIds.length;
      const correctCount = current.correctCount + (result.isCorrect ? 1 : 0);
      const wrongCount = current.wrongCount + (result.isCorrect ? 0 : 1);
      const totalAttempts = correctCount + wrongCount;
      const pastExamSolved =
        result.isPastExam && !current.solvedQuestionIds.includes(result.questionId)
          ? current.pastExamSolved + 1
          : current.pastExamSolved;

      return {
        ...current,
        solvedQuestionIds,
        totalSolved,
        correctCount,
        wrongCount,
        accuracy: totalAttempts ? (correctCount / totalAttempts) * 100 : 0,
        activeReviewCount: Math.max(0, current.activeReviewCount + result.activeReviewDelta),
        pastExamSolved,
        resumeQuestionId: result.questionId,
        preferences: {
          ...current.preferences,
          lastMode: mode,
          lastQuestionId: result.questionId
        }
      };
    });
  }

  async function persistAttemptInBackground(payload: QueuedAttempt) {
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (!response.ok) {
        throw new Error("submit_failed");
      }

      const savedResult = (await response.json()) as AttemptResult;
      const optimisticReviewDelta = payload.selectedLabel === "UNKNOWN" ? 1 : 0;
      const reviewDeltaCorrection = savedResult.activeReviewDelta - optimisticReviewDelta;

      if (reviewDeltaCorrection !== 0) {
        setProgress((current) => ({
          ...current,
          activeReviewCount: Math.max(0, current.activeReviewCount + reviewDeltaCorrection)
        }));
      }

      setError(null);
    } catch {
      const queue = [...readQueuedAttempts(), payload];
      writeQueuedAttempts(queue);
      setSyncPending(true);
      setError("연습 기록을 임시 보관했습니다. 네트워크가 안정되면 자동 저장됩니다.");
    }
  }

  function handleComplete(isKnown = true) {
    if (!currentQuestion || submission.submitted) {
      return false;
    }

    const isSelfCheckedActivity = currentQuestion.activityType !== "speaking" || currentQuestion.choices.length === 0;
    const completedLabel = isSelfCheckedActivity ? (isKnown ? "KNOWN" : "UNKNOWN") : currentQuestion.answer.label ?? "DONE";
    setError(null);
    const result: AttemptResult = {
      questionId: currentQuestion.id,
      isCorrect: isKnown,
      isPastExam: currentQuestion.isPastExam,
      activeReviewDelta: isKnown ? 0 : 1,
      correctLabel: currentQuestion.answer.label,
      correctText: currentQuestion.answer.text
    };

    setSelectedLabel(completedLabel);
    setSubmission({
      submitted: true,
      isCorrect: isKnown,
      correctLabel: result.correctLabel,
      correctText: result.correctText,
      submittedAt: new Date().toISOString()
    });
    setShowSolution(true);
    setTimerRunning(false);
    setFeedbackState(isKnown ? null : "wrong");
    updateProgressOptimistically(result);

    void persistAttemptInBackground({
      questionId: currentQuestion.id,
      selectedLabel: completedLabel,
      mode
    });
    return true;
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
    const isSelfCheckedActivity = currentQuestion?.activityType !== "speaking";

    if (isSelfCheckedActivity) {
      if (!showSolution) {
        setShowSolution(true);
        return;
      }

      if (mode === "review") {
        await handleNext();
        return;
      }

      if (!submission.submitted) {
        handleComplete(true);
      }

      await handleNext();
      return;
    }

    if (!submission.submitted) {
      handleComplete(true);
      return;
    }

    await handleNext();
  }

  async function handleKnowledgeCheck(isKnown: boolean) {
    if (mode === "review") {
      await handleNext();
      return;
    }

    const recorded = handleComplete(isKnown);
    if (recorded) await handleNext();
  }

  async function handleHideQuestion() {
    if (!currentQuestion) {
      return;
    }

    if (mode === "review") {
      const recorded = handleComplete(true);
      if (recorded) await handleNext();
      return;
    }

    const result: AttemptResult = {
      questionId: currentQuestion.id,
      isCorrect: true,
      isPastExam: currentQuestion.isPastExam,
      activeReviewDelta: 0,
      correctLabel: currentQuestion.answer.label,
      correctText: currentQuestion.answer.text
    };

    setSelectedLabel("HIDDEN");
    setSubmission({
      submitted: true,
      isCorrect: true,
      correctLabel: result.correctLabel,
      correctText: result.correctText,
      submittedAt: new Date().toISOString()
    });
    updateProgressOptimistically(result);

    void persistAttemptInBackground({
      questionId: currentQuestion.id,
      selectedLabel: "HIDDEN",
      mode
    });

    await handleNext();
  }

  async function handleAdvance() {
    if (
      mode !== "review" &&
      currentQuestion?.activityType !== "speaking" &&
      showSolution &&
      !submission.submitted
    ) {
      handleComplete(true);
    }

    await handleNext();
  }

  function handleModeSelect(nextMode: StudyMode) {
    setMobilePanelOpen(false);
    void loadMode(nextMode);
  }

  function handleOrderSelect(nextOrder: OrderMode) {
    setMobilePanelOpen(false);
    handleOrderChange(nextOrder);
  }

  const sidebar = (
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
      onOrderSelect={handleOrderSelect}
    />
  );

  if (!currentQuestion) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.48fr]">
        <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block lg:self-start">
          {sidebar}
        </aside>
        <section className="rounded-[14px] border border-black/8 bg-white/80 p-8 text-center shadow-soft">
          <p className="font-serif text-3xl text-ink">표시할 질문이 없습니다.</p>
          <p className="mt-3 text-sm text-ink/65">조건에 맞는 연습 항목이 없습니다.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.82fr_1.48fr]">
      <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block lg:self-start">
        {sidebar}
      </aside>

      <section
        className={cn(
          "relative rounded-[14px] border border-black/8 bg-white/80 p-4 shadow-soft sm:p-5",
          feedbackState === "correct" && "feedback-shell-correct",
          feedbackState === "wrong" && "feedback-shell-wrong"
        )}
      >
        {feedbackState ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[14px]",
              feedbackState === "correct" ? "feedback-flash-correct" : "feedback-flash-wrong"
            )}
          />
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2 text-xs text-ink/62">
            <span className="rounded-[10px] border border-black/10 px-2.5 py-1">{modeLabel(mode)}</span>
            <span>{index + 1} / {data.total}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobilePanelOpen(true)}
            className="rounded-[10px] border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/75"
          >
            설정
          </button>
        </div>

        <div className="hidden">
          <span className="rounded-[10px] border border-black/10 px-3 py-1 text-xs font-medium text-ink/70">
            {currentQuestion.sourceSection}
          </span>
          {currentQuestion.isPastExam ? (
            <span className="rounded-[10px] border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              모의시험
            </span>
          ) : shouldShowActivityBadge(currentQuestion) ? (
            <span className="rounded-[10px] border border-black/10 px-3 py-1 text-xs font-medium text-ink/55">
              {activityLabel(currentQuestion)}
            </span>
          ) : null}
        </div>

        <h2 className="font-serif text-2xl leading-snug text-ink sm:text-[2rem]">
          {currentQuestion.prompt || `질문 ${currentQuestion.number}`}
        </h2>

        {currentQuestion.context ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/72">
            {currentQuestion.context}
          </p>
        ) : null}

        <ActivityWorkspace
          question={currentQuestion}
          timerRunning={timerRunning}
          timerCentiseconds={timerCentiseconds}
          submitted={submission.submitted}
          onComplete={() => void handleComplete(true)}
          onStartTimer={() => setTimerRunning(true)}
          onPauseTimer={() => setTimerRunning(false)}
          onResetTimer={() => {
            setTimerRunning(false);
            setTimerCentiseconds(0);
          }}
        />

        {error ? (
          <p className="mt-3 rounded-[10px] border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        ) : null}

        {syncPending && !error ? (
          <p className="mt-3 rounded-[10px] border border-posco/15 bg-posco/8 px-4 py-3 text-sm text-posco">
            연습 기록을 백그라운드에서 저장 중입니다.
          </p>
        ) : null}

        <div className="mt-4">
          <RevealCard
            label={solutionLabel(currentQuestion)}
            value={
              showSolution ? (
                <div className="space-y-2">
                  <div>
                    답: <strong>{currentQuestion.answer.text}</strong>
                  </div>
                  <div className="whitespace-pre-line">{currentQuestion.explanation}</div>
                </div>
              ) : null
            }
            enabled={showSolution}
            disabled={false}
            readyText="눌러서 다음 질문"
            onToggle={() => void handleSolutionAction()}
          />
          {currentQuestion.activityType !== "speaking" && showSolution && !submission.submitted ? (
            <div className="mt-3">
              <PostAnswerActions
                onHide={() => void handleHideQuestion()}
                onCheckAgain={() => void handleKnowledgeCheck(false)}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <SecondaryAction onClick={handlePrevious} disabled={index === 0}>
            이전 질문
          </SecondaryAction>
          <SecondaryAction
            onClick={() => void handleAdvance()}
            disabled={!canGoNext}
          >
            다음 질문
          </SecondaryAction>
        </div>

        <div className="hidden">
          <p className="text-xs text-ink/55">
            마지막 연습 모드: {progress.preferences.lastMode}
            {progress.resumeQuestionId ? ` / 이어 연습 ID: ${progress.resumeQuestionId}` : ""}
          </p>
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
            className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[14px] bg-[#f8fbff] p-4 pb-28 shadow-[0_-18px_40px_rgba(16,35,63,.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-[6px] bg-black/10" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Settings</p>
                <p className="mt-1 font-serif text-xl text-ink">연습 설정</p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="rounded-[10px] border border-black/10 px-3 py-1.5 text-xs font-medium text-ink/70"
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
                onOrderSelect={handleOrderSelect}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActivityWorkspace({
  question,
  timerRunning,
  timerCentiseconds,
  submitted,
  onComplete,
  onStartTimer,
  onPauseTimer,
  onResetTimer
}: {
  question: Question;
  timerRunning: boolean;
  timerCentiseconds: number;
  submitted: boolean;
  onComplete: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
}) {
  if (question.activityType === "speaking") {
    return (
      <div className="mt-4 rounded-[10px] border border-black/10 bg-[#f8fbff] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Speaking Timer</p>
            <p className="mt-1 font-serif text-4xl text-ink">{formatElapsed(timerCentiseconds)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TimerAction onClick={timerRunning ? onPauseTimer : onStartTimer} disabled={submitted}>
              {timerRunning ? "일시정지" : timerRunning || timerCentiseconds > 0 ? "계속" : "타이머 시작"}
            </TimerAction>
            <TimerAction onClick={onResetTimer} disabled={submitted || timerCentiseconds === 0}>
              초기화
            </TimerAction>
          </div>
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={submitted}
          className={cn(
            "mt-4 w-full rounded-[10px] border px-4 py-3 text-sm font-semibold transition",
            submitted
              ? "border-black/10 bg-black/5 text-ink/40"
              : "border-pine/20 bg-pine text-white hover:bg-[#004b8d]"
          )}
        >
          {submitted ? "응답 완료됨" : "응답 완료하고 샘플 답변 보기"}
        </button>
      </div>
    );
  }

  return null;
}

function formatElapsed(totalCentiseconds: number) {
  const minutes = Math.floor(totalCentiseconds / 6000).toString().padStart(2, "0");
  const seconds = Math.floor((totalCentiseconds % 6000) / 100).toString().padStart(2, "0");
  const centiseconds = (totalCentiseconds % 100).toString().padStart(2, "0");
  return `${minutes}:${seconds}:${centiseconds}`;
}

function activityLabel(question: Question) {
  if (question.activityType === "translation-en-ko") return "영어 문장 -> 한국어";
  if (question.activityType === "translation-ko-en") return "한국어 문장 -> 영어";
  if (question.activityType === "vocab-en-ko") return "영단어 -> 한국어";
  if (question.activityType === "vocab-ko-en") return "한국어 -> 영단어";
  return "OPIc Speaking";
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/vocabulary/g, "vocab")
    .replace(/vocab|sentence/g, "")
    .replace(/english|영어|영단어/g, "en")
    .replace(/korean|한국어/g, "ko")
    .replace(/to|->|→|-/g, "")
    .replace(/\s+/g, "");
}

function shouldShowActivityBadge(question: Question) {
  return normalizeLabel(question.sourceSection) !== normalizeLabel(activityLabel(question));
}

function solutionLabel(question: Question) {
  return question.activityType === "speaking" ? "샘플 답변과 체크포인트" : "정답과 해설";
}

function modeLabel(mode: StudyMode) {
  if (mode === "speaking" || mode === "past") return "OPIc 모의시험";
  if (mode === "sentence") return "문장";
  if (mode === "sentence-en-ko") return "문장 EN→KO";
  if (mode === "sentence-ko-en") return "문장 KO→EN";
  if (mode === "vocab") return "단어";
  if (mode === "vocab-en-ko") return "단어 EN→KO";
  if (mode === "vocab-ko-en") return "단어 KO→EN";
  if (mode === "review") return "다시 연습";
  return "전체";
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
  onOrderSelect: (orderMode: OrderMode) => void;
}) {
  return (
    <>
      <section className="rounded-[12px] border border-black/8 bg-white/80 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Mode</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeButton active={mode === "speaking"} onClick={() => onModeSelect("speaking")} className="col-span-2">
            OPIc 모의시험
          </ModeButton>
          <ModeButton active={mode === "sentence-en-ko"} onClick={() => onModeSelect("sentence-en-ko")}>
            [문장] 영어 → 한국어
          </ModeButton>
          <ModeButton active={mode === "sentence-ko-en"} onClick={() => onModeSelect("sentence-ko-en")}>
            [문장] 한국어 → 영어
          </ModeButton>
          <ModeButton active={mode === "vocab-en-ko"} onClick={() => onModeSelect("vocab-en-ko")}>
            [단어] 영어 → 한국어
          </ModeButton>
          <ModeButton active={mode === "vocab-ko-en"} onClick={() => onModeSelect("vocab-ko-en")}>
            [단어] 한국어 → 영어
          </ModeButton>
          <ModeButton active={mode === "review"} onClick={() => onModeSelect("review")} className="col-span-2">
            [복습] 모르는 것만
          </ModeButton>
        </div>
      </section>

      <section className="rounded-[12px] border border-black/8 bg-white/80 p-4 shadow-soft">
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

      <section className="rounded-[12px] border border-black/8 bg-white/80 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Progress</p>
            <p className="mt-1 font-serif text-2xl text-ink">
              {solvedCount} / {total}
            </p>
          </div>
          <span className="rounded-[10px] border border-pine/15 bg-pine/10 px-3 py-1 text-xs font-medium text-pine">
            {mode.toUpperCase()}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-[6px] bg-mist">
          <div className="h-full rounded-[6px] bg-pine transition-all duration-300" style={{ width: `${progressValue}%` }} />
        </div>

        <dl className="mt-3 grid gap-2 text-xs text-ink/70 sm:text-sm">
          <div className="flex items-center justify-between">
            <dt>완료율</dt>
            <dd className="font-medium text-ink">{toPercent(progress.accuracy)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>현재 위치</dt>
            <dd className="font-medium text-ink">{index + 1}번</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>복습 목록</dt>
            <dd className="font-medium text-ink">{progress.activeReviewCount}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <StudyResetButtons mode={mode} reviewFilter={reviewFilter} compact />
        </div>
      </section>
    </>
  );
}

function ModeButton({
  active,
  onClick,
  children,
  className
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[42px] w-full items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left text-sm transition",
        active
          ? "border-pine bg-pine/[0.09] text-pine"
          : "border-black/8 bg-sand/45 text-ink/70 hover:border-pine/18 hover:text-pine",
        className
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
        "rounded-[10px] px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-pine text-white" : "bg-black/5 text-ink/65 hover:bg-pine/10 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}

function PostAnswerActions({
  onHide,
  onCheckAgain
}: {
  onHide: () => void;
  onCheckAgain: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onHide}
        className="rounded-[10px] border border-[#f0c9c7] bg-[#fff4f3] px-4 py-3 text-sm font-medium text-[#a86666] transition hover:border-[#e9b9b7] hover:bg-[#ffecea]"
      >
        Don&apos;t show me again
      </button>
      <button
        type="button"
        onClick={onCheckAgain}
        className="rounded-[10px] border border-[#b9d8f2] bg-[#f0f8ff] px-4 py-3 text-sm font-medium text-[#346f9f] transition hover:border-[#9fc9ec] hover:bg-[#e4f3ff]"
      >
        I want to check it again
      </button>
    </div>
  );
}

function RevealCard({
  label,
  value,
  enabled,
  disabled,
  readyText = "열림",
  onToggle
}: {
  label: string;
  value: React.ReactNode;
  enabled: boolean;
  disabled: boolean;
  readyText?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-20 w-full flex-col items-stretch justify-start rounded-[10px] border px-4 py-3.5 text-left align-top transition-colors",
        "bg-sand/60",
        enabled ? "border-pine/20 bg-pine/[0.08]" : "border-black/8",
        disabled && "cursor-not-allowed border-dashed opacity-55"
      )}
      >
      <div className="flex w-full items-start justify-between gap-3">
        <p className="text-base font-semibold text-ink">{label}</p>
        <span className="text-[11px] text-ink/45">{enabled ? readyText : "닫힘"}</span>
      </div>
      {enabled ? (
        <div className="mt-2 text-sm leading-6 text-ink/72">
          {value}
        </div>
      ) : null}
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
        "w-full rounded-[10px] border px-3 py-2.5 text-sm font-medium transition",
        disabled
          ? "border-dashed border-black/10 bg-black/5 text-ink/35"
          : "border-black/10 bg-white text-ink/75 hover:border-pine/30 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}

function TimerAction({
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
        "rounded-[10px] border px-3 py-2 text-sm font-medium transition",
        disabled
          ? "border-dashed border-black/10 bg-black/5 text-ink/35"
          : "border-black/10 bg-white text-ink/75 hover:border-pine/30 hover:text-pine"
      )}
    >
      {children}
    </button>
  );
}
