/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const markdownPath = path.join(root, "1.text_extracted.md");
const jsonPath = path.join(root, "1.questions.json");

function isChoiceLine(line) {
  return /^[①②③④]\s*/.test(line.trim());
}

function isAnswerLine(line) {
  return /^정답\s*:/.test(line.trim());
}

function normalizeParagraphs(lines) {
  const paragraphs = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (current.length) {
        paragraphs.push(current.join(" ").trim());
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length) {
    paragraphs.push(current.join(" ").trim());
  }

  return paragraphs.filter(Boolean);
}

function parsePromptBlock(lines, startIndex, inlinePrompt = "") {
  const collected = [];

  if (inlinePrompt.trim()) {
    collected.push(inlinePrompt.trim());
  }

  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^##\s+/.test(trimmed) || /^###\s+\d+\./.test(trimmed) || /^\d+\.\s*문제:/.test(trimmed)) {
      break;
    }

    if (isChoiceLine(trimmed) || isAnswerLine(trimmed)) {
      break;
    }

    collected.push(line);
    index += 1;
  }

  const paragraphs = normalizeParagraphs(collected);

  return {
    nextIndex: index,
    question: paragraphs[0] || "",
    questionContext: paragraphs.slice(1).join("\n\n")
  };
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const promptMap = new Map();
  let currentSection = "";

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    const sectionMatch = trimmed.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const modernMatch = trimmed.match(/^###\s+(\d+)\./);
    if (modernMatch && currentSection) {
      let cursor = index + 1;

      while (cursor < lines.length && !lines[cursor].trim()) {
        cursor += 1;
      }

      const promptLine = (lines[cursor] || "").trim();
      const promptMatch = promptLine.match(/^문제:\s*(.*)$/);

      if (promptMatch) {
        const parsed = parsePromptBlock(lines, cursor + 1, promptMatch[1]);
        promptMap.set(`${currentSection}::${Number(modernMatch[1])}`, {
          question: parsed.question,
          questionContext: parsed.questionContext
        });
        index = parsed.nextIndex - 1;
      }

      continue;
    }

    const legacyMatch = trimmed.match(/^(\d+)\.\s*문제:\s*(.*)$/);
    if (legacyMatch && currentSection) {
      const parsed = parsePromptBlock(lines, index + 1, legacyMatch[2]);
      promptMap.set(`${currentSection}::${Number(legacyMatch[1])}`, {
        question: parsed.question,
        questionContext: parsed.questionContext
      });
      index = parsed.nextIndex - 1;
    }
  }

  return promptMap;
}

function main() {
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const promptMap = parseMarkdown(markdown);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  let repaired = 0;

  for (const question of json.questions) {
    const key = `${question.source_section}::${question.number}`;
    const parsed = promptMap.get(key);

    if (!parsed) continue;

    if (!question.question || !question.question.trim()) {
      question.question = parsed.question;
      repaired += 1;
    }

    if ((!question.question_context || !question.question_context.trim()) && parsed.questionContext) {
      question.question_context = parsed.questionContext;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");
  console.log(`repaired_questions=${repaired}`);
}

main();
