import { getQuestionBank, getQuestionsByMode } from "@/lib/questions";
import { getSessionId } from "@/lib/session";
import {
  ensureSessionRecord,
  getHiddenQuestionIds,
  getProgress,
  getReviewQuestionIds,
  getWrongQuestionSummaries,
  resetSessionProgress,
  resetSessionHiddenQuestions,
  resetSessionQuestionsProgress,
  resetSessionWrongQuestions,
  submitAttempt,
  updatePreferences
} from "@/lib/storage";
import {
  AttemptPayload,
  AttemptResult,
  PreferencePayload,
  QuestionApiResponse,
  ReviewFilter,
  StudyPayload,
  ProgressSummary,
  StudyMode,
  WrongQuestionSummary
} from "@/lib/types";

export async function fetchQuestionPayload(
  mode: StudyMode,
  cursor = 0,
  reviewFilter: ReviewFilter = "active"
): Promise<QuestionApiResponse> {
  const sessionId = await getSessionId();
  const reviewIds =
    mode === "review" ? await getReviewQuestionIds({ sessionId, filter: reviewFilter }) : [];
  const [questions, hiddenIds] = await Promise.all([
    getQuestionsByMode(mode, reviewIds),
    getHiddenQuestionIds(sessionId)
  ]);
  const hiddenSet = new Set(hiddenIds);
  const visibleQuestions = questions.filter((question) => !hiddenSet.has(question.id));

  return {
    mode,
    total: visibleQuestions.length,
    cursor,
    questions: visibleQuestions
  };
}

export async function fetchStudyPayload(
  mode: StudyMode,
  cursor = 0,
  reviewFilter: ReviewFilter = "active"
): Promise<StudyPayload> {
  const sessionId = await getSessionId();
  const [allQuestions, reviewIds, hiddenIds] = await Promise.all([
    getQuestionBank(),
    mode === "review" ? getReviewQuestionIds({ sessionId, filter: reviewFilter }) : Promise.resolve([]),
    getHiddenQuestionIds(sessionId)
  ]);
  const questions = await getQuestionsByMode(mode, reviewIds);
  const hiddenSet = new Set(hiddenIds);
  const visibleQuestions = questions.filter((question) => !hiddenSet.has(question.id));
  const progress = await getProgress({ sessionId, questions: allQuestions });

  return {
    questionPayload: {
      mode,
      total: visibleQuestions.length,
      cursor,
      questions: visibleQuestions
    },
    progress
  };
}

export async function fetchProgress() {
  const sessionId = await getSessionId();
  const questions = await getQuestionBank();
  return getProgress({ sessionId, questions });
}

export async function fetchWrongQuestions(): Promise<WrongQuestionSummary[]> {
  const sessionId = await getSessionId();
  const questions = await getQuestionBank();
  return getWrongQuestionSummaries({ sessionId, questions });
}

export async function fetchStatsPayload(): Promise<{
  progress: ProgressSummary;
  wrongQuestions: WrongQuestionSummary[];
}> {
  const sessionId = await getSessionId();
  const questions = await getQuestionBank();
  const [progress, wrongQuestions] = await Promise.all([
    getProgress({ sessionId, questions }),
    getWrongQuestionSummaries({ sessionId, questions })
  ]);

  return {
    progress,
    wrongQuestions
  };
}

export async function createAttempt(payload: AttemptPayload) {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const questions = await getQuestionBank();
  return submitAttempt({ sessionId, questions, payload }) satisfies Promise<AttemptResult>;
}

export async function savePreferences(payload: PreferencePayload) {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  return updatePreferences({ sessionId, preferences: payload });
}

export async function resetProgress() {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  return resetSessionProgress(sessionId);
}

export async function resetWrongQuestions() {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  return resetSessionWrongQuestions(sessionId);
}

export async function resetHiddenQuestions() {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  return resetSessionHiddenQuestions(sessionId);
}

export async function resetModeProgress(mode: StudyMode, reviewFilter: ReviewFilter = "active") {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);

  const reviewIds =
    mode === "review" ? await getReviewQuestionIds({ sessionId, filter: reviewFilter }) : [];
  const questions = await getQuestionsByMode(mode, reviewIds);

  return resetSessionQuestionsProgress(
    sessionId,
    questions.map((question) => question.id)
  );
}
