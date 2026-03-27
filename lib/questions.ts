import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { Question, QuestionRecord, StudyMode } from "@/lib/types";

const QUESTION_FILE = path.join(process.cwd(), "1.questions.json");

type RawBank = {
  questions: QuestionRecord[];
};

function mapQuestion(record: QuestionRecord): Question {
  return {
    id: record.id,
    number: record.number,
    sourceSection: record.source_section,
    isPastExam: record.is_past_exam,
    prompt: record.question,
    context: record.question_context,
    choices: record.choices,
    answer: {
      label: record.answer.label,
      index: record.answer.index,
      text: record.answer.text
    },
    explanation: record.explanation
  };
}

export const getQuestionBank = cache(async () => {
  const raw = await fs.readFile(QUESTION_FILE, "utf8");
  const json = JSON.parse(raw) as RawBank;
  return json.questions.map(mapQuestion);
});

export async function getQuestionsByMode(mode: StudyMode, reviewIds: string[] = []) {
  const questions = await getQuestionBank();

  if (mode === "past") {
    return questions.filter((question) => question.isPastExam);
  }

  if (mode === "review") {
    const reviewSet = new Set(reviewIds);
    return questions.filter((question) => reviewSet.has(question.id));
  }

  return questions;
}
