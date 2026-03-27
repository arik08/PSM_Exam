export type StudyMode = "all" | "past" | "review";
export type ReviewFilter = "active" | "recent" | "past-only";
export type OrderMode = "sequential" | "random";
export type RevealMode = "manual" | "auto-after-submit";

export type QuestionChoice = {
  label: string;
  text: string;
};

export type QuestionAnswer = {
  label: string | null;
  index: number | null;
  text: string;
  raw: string;
};

export type QuestionRecord = {
  id: string;
  number: number;
  source_section: string;
  is_past_exam: boolean;
  question: string;
  question_context: string;
  choices: QuestionChoice[];
  answer: QuestionAnswer;
  explanation: string;
};

export type Question = {
  id: string;
  number: number;
  sourceSection: string;
  isPastExam: boolean;
  prompt: string;
  context: string;
  choices: QuestionChoice[];
  answer: {
    label: string | null;
    index: number | null;
    text: string;
  };
  explanation: string;
};

export type PreferencePayload = {
  answerRevealMode: RevealMode;
  explanationRevealMode: RevealMode;
};

export type AttemptPayload = {
  questionId: string;
  selectedLabel: string;
  mode: StudyMode;
};

export type AttemptRecord = {
  sessionId: string;
  questionId: string;
  selectedChoice: string;
  isCorrect: boolean;
  attemptedAt: string;
  mode: StudyMode;
};

export type ReviewItem = {
  sessionId: string;
  questionId: string;
  status: "active" | "resolved";
  lastWrongAt: string;
  wrongCount: number;
  isPastExam: boolean;
};

export type UserPreferences = {
  sessionId: string;
  answerRevealMode: RevealMode;
  explanationRevealMode: RevealMode;
  lastMode: StudyMode;
  lastQuestionId: string | null;
};

export type ProgressSummary = {
  totalQuestions: number;
  totalSolved: number;
  solvedQuestionIds: string[];
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  activeReviewCount: number;
  pastExamCount: number;
  pastExamSolved: number;
  resumeQuestionId: string | null;
  preferences: UserPreferences;
};

export type QuestionApiResponse = {
  mode: StudyMode;
  total: number;
  cursor: number;
  questions: Question[];
};

export type StudyPayload = {
  questionPayload: QuestionApiResponse;
  progress: ProgressSummary;
};

export type AttemptResult = {
  isCorrect: boolean;
  correctLabel: string | null;
  correctText: string;
  progress: ProgressSummary;
};

export type WrongQuestionSummary = {
  questionId: string;
  prompt: string;
  sourceSection: string;
  isPastExam: boolean;
  wrongCount: number;
  lastWrongAt: string;
  status: "active" | "resolved";
  answerText: string;
};
