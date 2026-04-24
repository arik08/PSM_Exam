import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { ActivityType, Question, QuestionRecord, StudyMode } from "@/lib/types";

const QUESTION_FILE = path.join(process.cwd(), "1.questions.json");

type RawBank = {
  questions: QuestionRecord[];
};

function makeAnswer(text: string) {
  return {
    label: "DONE",
    index: 0,
    text
  };
}

function makePairQuestion(
  record: QuestionRecord,
  direction: Extract<ActivityType, "translation-en-ko" | "translation-ko-en" | "vocab-en-ko" | "vocab-ko-en">
): Question {
  const isTranslation = record.activity_type === "translation-pair";
  const english = record.english ?? record.question ?? "";
  const korean = record.korean ?? record.answer?.text ?? "";
  const isEnKo = direction.endsWith("en-ko");

  return {
    id: `${record.id}:${isEnKo ? "en-ko" : "ko-en"}`,
    number: record.number,
    activityType: direction,
    sourceSection: isTranslation
      ? `Sentence ${isEnKo ? "EN -> KO" : "KO -> EN"}`
      : `Vocabulary ${isEnKo ? "EN -> KO" : "KO -> EN"}`,
    isPastExam: record.is_past_exam,
    prompt: isEnKo ? english : korean,
    context: "",
    choices: [],
    answer: makeAnswer(isEnKo ? korean : english),
    explanation: record.explanation
  };
}

function mapQuestion(record: QuestionRecord): Question[] {
  if (record.activity_type === "translation-pair") {
    return [
      makePairQuestion(record, "translation-en-ko"),
      makePairQuestion(record, "translation-ko-en")
    ];
  }

  if (record.activity_type === "vocab-pair") {
    return [
      makePairQuestion(record, "vocab-en-ko"),
      makePairQuestion(record, "vocab-ko-en")
    ];
  }

  const answer = record.answer ?? {
    label: "DONE",
    index: 0,
    text: "",
    raw: "DONE"
  };

  return [{
    id: record.id,
    number: record.number,
    activityType: record.activity_type ?? "speaking",
    sourceSection: record.source_section,
    isPastExam: record.is_past_exam,
    prompt: record.question ?? "",
    context: record.question_context ?? "",
    choices: record.choices ?? [],
    answer: {
      label: answer.label,
      index: answer.index,
      text: answer.text
    },
    explanation: record.explanation
  }];
}

export const getQuestionBank = cache(async () => {
  const raw = await fs.readFile(QUESTION_FILE, "utf8");
  const json = JSON.parse(raw) as RawBank;
  return json.questions.flatMap(mapQuestion);
});

export async function getQuestionsByMode(mode: StudyMode, reviewIds: string[] = []) {
  const questions = await getQuestionBank();

  if (mode === "speaking" || mode === "past") {
    return questions.filter((question) => question.activityType === "speaking");
  }

  if (mode === "sentence") {
    return questions.filter((question) => question.activityType.startsWith("translation"));
  }

  if (mode === "sentence-en-ko") {
    return questions.filter((question) => question.activityType === "translation-en-ko");
  }

  if (mode === "sentence-ko-en") {
    return questions.filter((question) => question.activityType === "translation-ko-en");
  }

  if (mode === "vocab") {
    return questions.filter((question) => question.activityType.startsWith("vocab"));
  }

  if (mode === "vocab-en-ko") {
    return questions.filter((question) => question.activityType === "vocab-en-ko");
  }

  if (mode === "vocab-ko-en") {
    return questions.filter((question) => question.activityType === "vocab-ko-en");
  }

  if (mode === "review") {
    const reviewSet = new Set(reviewIds);
    return questions.filter((question) => reviewSet.has(question.id));
  }

  return questions;
}
