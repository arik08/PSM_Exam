import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  AttemptPayload,
  AttemptRecord,
  ProgressSummary,
  Question,
  ReviewFilter,
  ReviewItem,
  UserPreferences,
  WrongQuestionSummary
} from "@/lib/types";

type SessionRecord = {
  sessionId: string;
  createdAt: string;
  lastSeenAt: string;
};

type FileDb = {
  anonymousSessions: SessionRecord[];
  questionAttempts: AttemptRecord[];
  reviewItems: ReviewItem[];
  userPreferences: UserPreferences[];
};

type StorageContext = {
  sessionId: string;
  questions: Question[];
};

const DEFAULT_PREFERENCES = {
  answerRevealMode: "manual",
  explanationRevealMode: "manual",
  lastMode: "all",
  lastQuestionId: null
} as const;

const DATA_DIR = path.join(process.cwd(), ".app-data");
const DB_FILE = path.join(DATA_DIR, "study-db.json");
const isVercelRuntime = process.env.VERCEL === "1";
const shouldUseSupabase =
  isVercelRuntime || process.env.USE_SUPABASE_LOCAL === "1";

declare global {
  var __psmMemoryDb: FileDb | undefined;
}

function createEmptyDb(): FileDb {
  return {
    anonymousSessions: [],
    questionAttempts: [],
    reviewItems: [],
    userPreferences: []
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readDb(): Promise<FileDb> {
  if (isVercelRuntime) {
    if (!globalThis.__psmMemoryDb) {
      globalThis.__psmMemoryDb = createEmptyDb();
    }

    return globalThis.__psmMemoryDb;
  }

  await ensureDataDir();

  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    if (!raw.trim()) {
      const emptyDb = createEmptyDb();
      await writeDb(emptyDb);
      return emptyDb;
    }

    const parsed = JSON.parse(raw) as Partial<FileDb>;

    return {
      anonymousSessions: Array.isArray(parsed.anonymousSessions) ? parsed.anonymousSessions : [],
      questionAttempts: Array.isArray(parsed.questionAttempts) ? parsed.questionAttempts : [],
      reviewItems: Array.isArray(parsed.reviewItems) ? parsed.reviewItems : [],
      userPreferences: Array.isArray(parsed.userPreferences) ? parsed.userPreferences : []
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return createEmptyDb();
    }

    if (error instanceof SyntaxError) {
      const backupPath = path.join(
        DATA_DIR,
        `study-db.corrupted-${Date.now()}.json`
      );
      const raw = await fs.readFile(DB_FILE, "utf8").catch(() => "");

      if (raw.trim()) {
        await fs.writeFile(backupPath, raw, "utf8");
      }

      const emptyDb = createEmptyDb();
      await writeDb(emptyDb);
      return emptyDb;
    }

    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return createEmptyDb();
  }
}

async function writeDb(db: FileDb) {
  if (isVercelRuntime) {
    globalThis.__psmMemoryDb = db;
    return;
  }

  await ensureDataDir();
  const tempFile = `${DB_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.copyFile(tempFile, DB_FILE);
      await fs.unlink(tempFile).catch(() => undefined);
      return;
    } catch (error) {
      lastError = error;
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "EPERM" && nodeError.code !== "EBUSY") {
        await fs.unlink(tempFile).catch(() => undefined);
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }

  await fs.unlink(tempFile).catch(() => undefined);
  throw lastError;
}

function getDefaultPreferences(sessionId: string): UserPreferences {
  return {
    sessionId,
    answerRevealMode: DEFAULT_PREFERENCES.answerRevealMode,
    explanationRevealMode: DEFAULT_PREFERENCES.explanationRevealMode,
    lastMode: DEFAULT_PREFERENCES.lastMode,
    lastQuestionId: DEFAULT_PREFERENCES.lastQuestionId
  };
}

function computeProgress(
  sessionId: string,
  questions: Question[],
  attempts: AttemptRecord[],
  reviewItems: ReviewItem[],
  preferences: UserPreferences
): ProgressSummary {
  const sessionAttempts = attempts.filter((attempt) => attempt.sessionId === sessionId);
  const activeReview = reviewItems.filter(
    (item) => item.sessionId === sessionId && item.status === "active"
  );
  const solved = new Set(sessionAttempts.map((attempt) => attempt.questionId));
  const correctCount = sessionAttempts.filter((attempt) => attempt.isCorrect).length;
  const wrongCount = sessionAttempts.filter((attempt) => !attempt.isCorrect).length;
  const pastQuestions = questions.filter((question) => question.isPastExam);
  const pastSolved = sessionAttempts.filter((attempt) =>
    pastQuestions.some((question) => question.id === attempt.questionId)
  );

  return {
    totalQuestions: questions.length,
    totalSolved: solved.size,
    solvedQuestionIds: [...solved],
    correctCount,
    wrongCount,
    accuracy: sessionAttempts.length ? (correctCount / sessionAttempts.length) * 100 : 0,
    activeReviewCount: activeReview.length,
    pastExamCount: pastQuestions.length,
    pastExamSolved: new Set(pastSolved.map((attempt) => attempt.questionId)).size,
    resumeQuestionId: preferences.lastQuestionId,
    preferences
  };
}

function getSupabaseClient() {
  if (!shouldUseSupabase) {
    return null;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

async function ensureSessionRecordInFileDb(sessionId: string) {
  const db = await readDb();
  const now = new Date().toISOString();
  const existing = db.anonymousSessions.find((session) => session.sessionId === sessionId);

  if (existing) {
    const lastSeenAt = Date.parse(existing.lastSeenAt);
    const nowTime = Date.parse(now);

    if (Number.isFinite(lastSeenAt) && nowTime - lastSeenAt < 5 * 60 * 1000) {
      return;
    }

    existing.lastSeenAt = now;
    await writeDb(db);
    return;
  }

  db.anonymousSessions.push({
    sessionId,
    createdAt: now,
    lastSeenAt: now
  });
  db.userPreferences.push(getDefaultPreferences(sessionId));
  await writeDb(db);
}

export async function ensureSessionRecord(sessionId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    await ensureSessionRecordInFileDb(sessionId);
    return;
  }

  const now = new Date().toISOString();

  await supabase.from("anonymous_sessions").upsert(
    {
      session_id: sessionId,
      created_at: now,
      last_seen_at: now
    },
    { onConflict: "session_id" }
  );

  await supabase.from("user_preferences").upsert(
    {
      session_id: sessionId,
      answer_reveal_mode: DEFAULT_PREFERENCES.answerRevealMode,
      explanation_reveal_mode: DEFAULT_PREFERENCES.explanationRevealMode,
      last_mode: DEFAULT_PREFERENCES.lastMode,
      last_question_id: DEFAULT_PREFERENCES.lastQuestionId
    },
    { onConflict: "session_id", ignoreDuplicates: true }
  );
}

export async function getProgress({ sessionId, questions }: StorageContext) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    const preferences =
      db.userPreferences.find((item) => item.sessionId === sessionId) ??
      getDefaultPreferences(sessionId);

    return computeProgress(
      sessionId,
      questions,
      db.questionAttempts,
      db.reviewItems,
      preferences
    );
  }

  const [{ data: attempts }, { data: reviews }, { data: prefs }] = await Promise.all([
    supabase.from("question_attempts").select("*").eq("session_id", sessionId),
    supabase.from("review_items").select("*").eq("session_id", sessionId),
    supabase.from("user_preferences").select("*").eq("session_id", sessionId).maybeSingle()
  ]);

  const mappedAttempts: AttemptRecord[] = (attempts ?? []).map((item) => ({
    sessionId: item.session_id,
    questionId: item.question_id,
    selectedChoice: item.selected_choice,
    isCorrect: item.is_correct,
    attemptedAt: item.attempted_at,
    mode: item.mode
  }));

  const mappedReviews: ReviewItem[] = (reviews ?? []).map((item) => ({
    sessionId: item.session_id,
    questionId: item.question_id,
    status: item.status,
    lastWrongAt: item.last_wrong_at,
    wrongCount: item.wrong_count,
    isPastExam: item.is_past_exam
  }));

  const preferences: UserPreferences = prefs
    ? {
        sessionId: prefs.session_id,
        answerRevealMode: prefs.answer_reveal_mode,
        explanationRevealMode: prefs.explanation_reveal_mode,
        lastMode: prefs.last_mode,
        lastQuestionId: prefs.last_question_id
      }
    : getDefaultPreferences(sessionId);

  return computeProgress(sessionId, questions, mappedAttempts, mappedReviews, preferences);
}

export async function submitAttempt({
  sessionId,
  questions,
  payload
}: StorageContext & { payload: AttemptPayload }) {
  const question = questions.find((item) => item.id === payload.questionId);

  if (!question) {
    throw new Error("Question not found.");
  }

  const isCorrect = question.answer.label === payload.selectedLabel;
  const attemptedAt = new Date().toISOString();
  const supabase = getSupabaseClient();
  let activeReviewDelta: -1 | 0 | 1 = 0;

  if (!supabase) {
    const db = await readDb();

    db.questionAttempts.push({
      sessionId,
      questionId: payload.questionId,
      selectedChoice: payload.selectedLabel,
      isCorrect,
      attemptedAt,
      mode: payload.mode
    });

    const reviewItem = db.reviewItems.find(
      (item) => item.sessionId === sessionId && item.questionId === payload.questionId
    );

    if (!isCorrect) {
      if (reviewItem) {
        if (reviewItem.status !== "active") {
          activeReviewDelta = 1;
        }
        reviewItem.status = "active";
        reviewItem.wrongCount += 1;
        reviewItem.lastWrongAt = attemptedAt;
      } else {
        activeReviewDelta = 1;
        db.reviewItems.push({
          sessionId,
          questionId: payload.questionId,
          status: "active",
          wrongCount: 1,
          lastWrongAt: attemptedAt,
          isPastExam: question.isPastExam
        });
      }
    } else if (reviewItem) {
      if (reviewItem.status === "active") {
        activeReviewDelta = -1;
      }
      reviewItem.status = "resolved";
    }

    const preferenceIndex = db.userPreferences.findIndex((item) => item.sessionId === sessionId);
    const preferences =
      preferenceIndex >= 0 ? db.userPreferences[preferenceIndex] : getDefaultPreferences(sessionId);

    preferences.lastMode = payload.mode;
    preferences.lastQuestionId = payload.questionId;

    if (preferenceIndex >= 0) {
      db.userPreferences[preferenceIndex] = preferences;
    } else {
      db.userPreferences.push(preferences);
    }

    await writeDb(db);

    return {
      questionId: payload.questionId,
      isCorrect,
      isPastExam: question.isPastExam,
      activeReviewDelta,
      correctLabel: question.answer.label,
      correctText: question.answer.text
    };
  }

  await supabase.from("question_attempts").insert({
    session_id: sessionId,
    question_id: payload.questionId,
    selected_choice: payload.selectedLabel,
    is_correct: isCorrect,
    attempted_at: attemptedAt,
    mode: payload.mode
  });

  const { data: reviewItem } = await supabase
    .from("review_items")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_id", payload.questionId)
    .maybeSingle();

  if (!isCorrect) {
    activeReviewDelta = reviewItem?.status === "active" ? 0 : 1;
    await supabase.from("review_items").upsert(
      {
        session_id: sessionId,
        question_id: payload.questionId,
        status: "active",
        last_wrong_at: attemptedAt,
        wrong_count: reviewItem ? reviewItem.wrong_count + 1 : 1,
        is_past_exam: question.isPastExam
      },
      { onConflict: "session_id,question_id" }
    );
  } else if (reviewItem) {
    if (reviewItem.status === "active") {
      activeReviewDelta = -1;
    }
    await supabase
      .from("review_items")
      .update({ status: "resolved" })
      .eq("session_id", sessionId)
      .eq("question_id", payload.questionId);
  }

  await supabase.from("user_preferences").upsert(
    {
      session_id: sessionId,
      last_mode: payload.mode,
      last_question_id: payload.questionId
    },
    { onConflict: "session_id" }
  );

  return {
    questionId: payload.questionId,
    isCorrect,
    isPastExam: question.isPastExam,
    activeReviewDelta,
    correctLabel: question.answer.label,
    correctText: question.answer.text
  };
}

export async function updatePreferences({
  sessionId,
  preferences
}: {
  sessionId: string;
  preferences: Partial<UserPreferences>;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    const index = db.userPreferences.findIndex((item) => item.sessionId === sessionId);
    const current = index >= 0 ? db.userPreferences[index] : getDefaultPreferences(sessionId);
    const next = { ...current, ...preferences, sessionId };

    if (index >= 0) {
      db.userPreferences[index] = next;
    } else {
      db.userPreferences.push(next);
    }

    await writeDb(db);
    return next;
  }

  await supabase.from("user_preferences").upsert(
    {
      session_id: sessionId,
      answer_reveal_mode: preferences.answerRevealMode,
      explanation_reveal_mode: preferences.explanationRevealMode,
      last_mode: preferences.lastMode,
      last_question_id: preferences.lastQuestionId
    },
    { onConflict: "session_id" }
  );

  return { sessionId, ...DEFAULT_PREFERENCES, ...preferences };
}

export async function getReviewQuestionIds({
  sessionId,
  filter
}: {
  sessionId: string;
  filter: ReviewFilter;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    let reviewItems = db.reviewItems.filter((item) => item.sessionId === sessionId);

    if (filter === "active") {
      reviewItems = reviewItems.filter((item) => item.status === "active");
    }

    if (filter === "recent") {
      reviewItems = [...reviewItems]
        .sort((a, b) => b.lastWrongAt.localeCompare(a.lastWrongAt))
        .slice(0, 20);
    }

    if (filter === "past-only") {
      reviewItems = reviewItems.filter((item) => item.isPastExam);
    }

    return reviewItems.map((item) => item.questionId);
  }

  let query = supabase.from("review_items").select("*").eq("session_id", sessionId);

  if (filter === "active") {
    query = query.eq("status", "active");
  }

  if (filter === "past-only") {
    query = query.eq("is_past_exam", true);
  }

  if (filter === "recent") {
    query = query.order("last_wrong_at", { ascending: false }).limit(20);
  }

  const { data } = await query;
  return (data ?? []).map((item) => item.question_id as string);
}

export async function getWrongQuestionSummaries({
  sessionId,
  questions
}: StorageContext): Promise<WrongQuestionSummary[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    const questionMap = new Map(questions.map((question) => [question.id, question]));

    return db.reviewItems
      .filter((item) => item.sessionId === sessionId)
      .sort((a, b) => {
        if (b.wrongCount !== a.wrongCount) {
          return b.wrongCount - a.wrongCount;
        }
        return b.lastWrongAt.localeCompare(a.lastWrongAt);
      })
      .map((item) => {
        const question = questionMap.get(item.questionId);

        return {
          questionId: item.questionId,
          prompt: question?.prompt || `문제 ${question?.number ?? ""}`.trim(),
          sourceSection: question?.sourceSection ?? "",
          isPastExam: question?.isPastExam ?? item.isPastExam,
          wrongCount: item.wrongCount,
          lastWrongAt: item.lastWrongAt,
          status: item.status,
          choices: question?.choices ?? [],
          answerLabel: question?.answer.label ?? null,
          answerText: question?.answer.text ?? ""
        };
      });
  }

  const { data } = await supabase
    .from("review_items")
    .select("*")
    .eq("session_id", sessionId)
    .order("wrong_count", { ascending: false })
    .order("last_wrong_at", { ascending: false });

  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return (data ?? []).map((item) => {
    const question = questionMap.get(item.question_id);

    return {
      questionId: item.question_id,
      prompt: question?.prompt || `문제 ${question?.number ?? ""}`.trim(),
      sourceSection: question?.sourceSection ?? "",
      isPastExam: question?.isPastExam ?? item.is_past_exam,
      wrongCount: item.wrong_count,
      lastWrongAt: item.last_wrong_at,
      status: item.status,
      choices: question?.choices ?? [],
      answerLabel: question?.answer.label ?? null,
      answerText: question?.answer.text ?? ""
    };
  });
}

export async function resetSessionProgress(sessionId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    db.questionAttempts = db.questionAttempts.filter((item) => item.sessionId !== sessionId);
    db.reviewItems = db.reviewItems.filter((item) => item.sessionId !== sessionId);

    const preferencesIndex = db.userPreferences.findIndex((item) => item.sessionId === sessionId);

    if (preferencesIndex >= 0) {
      db.userPreferences[preferencesIndex] = getDefaultPreferences(sessionId);
    } else {
      db.userPreferences.push(getDefaultPreferences(sessionId));
    }

    await writeDb(db);
    return { ok: true };
  }

  await Promise.all([
    supabase.from("question_attempts").delete().eq("session_id", sessionId),
    supabase.from("review_items").delete().eq("session_id", sessionId),
    supabase.from("user_preferences").upsert(
      {
        session_id: sessionId,
        answer_reveal_mode: DEFAULT_PREFERENCES.answerRevealMode,
        explanation_reveal_mode: DEFAULT_PREFERENCES.explanationRevealMode,
        last_mode: DEFAULT_PREFERENCES.lastMode,
        last_question_id: DEFAULT_PREFERENCES.lastQuestionId
      },
      { onConflict: "session_id" }
    )
  ]);

  return { ok: true };
}

export async function resetSessionWrongQuestions(sessionId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const db = await readDb();
    db.reviewItems = db.reviewItems.filter((item) => item.sessionId !== sessionId);
    await writeDb(db);
    return { ok: true };
  }

  await supabase.from("review_items").delete().eq("session_id", sessionId);
  return { ok: true };
}
