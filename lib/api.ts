import { getQuestionBank, getQuestionsByMode } from "@/lib/questions";
import { getSessionId } from "@/lib/session";
import {
  ensureSessionRecord,
  getProgress,
  getReviewQuestionIds,
  getWrongQuestionSummaries,
  resetSessionProgress,
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
  StudyMode,
  WrongQuestionSummary
} from "@/lib/types";

export async function fetchQuestionPayload(
  mode: StudyMode,
  cursor = 0,
  reviewFilter: ReviewFilter = "active"
): Promise<QuestionApiResponse> {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const reviewIds =
    mode === "review" ? await getReviewQuestionIds({ sessionId, filter: reviewFilter }) : [];
  const questions = await getQuestionsByMode(mode, reviewIds);

  return {
    mode,
    total: questions.length,
    cursor,
    questions
  };
}

export async function fetchStudyPayload(
  mode: StudyMode,
  cursor = 0,
  reviewFilter: ReviewFilter = "active"
): Promise<StudyPayload> {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const allQuestions = await getQuestionBank();
  const reviewIds =
    mode === "review" ? await getReviewQuestionIds({ sessionId, filter: reviewFilter }) : [];
  const questions = await getQuestionsByMode(mode, reviewIds);
  const progress = await getProgress({ sessionId, questions: allQuestions });

  return {
    questionPayload: {
      mode,
      total: questions.length,
      cursor,
      questions
    },
    progress
  };
}

export async function fetchProgress() {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const questions = await getQuestionBank();
  return getProgress({ sessionId, questions });
}

export async function fetchWrongQuestions(): Promise<WrongQuestionSummary[]> {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const questions = await getQuestionBank();
  return getWrongQuestionSummaries({ sessionId, questions });
}

export async function createAttempt(payload: AttemptPayload) {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const questions = await getQuestionBank();
  await submitAttempt({ sessionId, questions, payload });
  const progress = await getProgress({ sessionId, questions });
  const question = questions.find((item) => item.id === payload.questionId);

  return {
    isCorrect: question?.answer.label === payload.selectedLabel,
    correctLabel: question?.answer.label ?? null,
    correctText: question?.answer.text ?? "",
    progress
  } satisfies AttemptResult;
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
