/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const jsonPath = path.join(root, "1.questions.json");

const boilerplateFragments = [
  "관련 개념이지만",
  "문항의 초점은",
  "직접 연결되지 않는다",
  "같은 영역의 용어나 절차이지만",
  "일부 맥락에서는 맞을 수 있어도",
  "문항에서 찾는 '예외'가 아니라",
  "틀린 보기라기보다 일반적으로 맞는 설명 쪽에 가까워 정답이 아니다",
  "문항의 조건에서 제외해야 할 항목으로 보기 어렵다",
  "문항에서 요구한 기준값이나 주기와 일치하지 않는다",
  "비슷한 수치처럼 보이지만, 해당 기준으로 쓰는 값은 아니다",
  "를 적용하면 관리 기준이 달라지므로 정답으로 보기 어렵다",
  "문항에서 묻는 대상의 정의를 가장 정확히 가리키는 답은",
  "비슷해 보일 수 있으나, 명칭이나 기능의 초점이",
  "같은 분야 용어라도 적용 범위가 달라 같은 뜻으로 볼 수 없다"
];

function isChoiceExplanation(line) {
  return /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(line.trim());
}

function isBoilerplateChoiceExplanation(line) {
  return boilerplateFragments.some((fragment) => line.includes(fragment));
}

function cleanupExplanation(explanation) {
  const normalized = explanation.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return normalized;
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const introLines = [];
  const keptChoiceLines = [];

  for (const line of lines) {
    if (!line || line === "오답 보기") {
      continue;
    }

    if (!isChoiceExplanation(line)) {
      introLines.push(line);
      continue;
    }

    if (isBoilerplateChoiceExplanation(line)) {
      continue;
    }

    keptChoiceLines.push(line);
  }

  const intro = introLines.join(" ").trim();

  if (!intro) {
    return keptChoiceLines.join("\n").trim();
  }

  if (keptChoiceLines.length === 0) {
    return intro;
  }

  return `${intro}\n\n${keptChoiceLines.join("\n")}`.trim();
}

function main() {
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let updated = 0;

  for (const question of json.questions) {
    const nextExplanation = cleanupExplanation(question.explanation || "");

    if (nextExplanation !== question.explanation) {
      question.explanation = nextExplanation;
      updated += 1;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");
  console.log(`updated_explanations=${updated}`);
}

main();
