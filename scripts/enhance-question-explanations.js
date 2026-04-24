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

const conceptGlossary = {
  "PFD": "공정의 큰 흐름, 주요 장치, 물질수지와 열수지를 중심으로 나타내는 도면이다. 공정 전체를 거시적으로 파악할 때 쓴다.",
  "P&ID": "배관, 밸브, 계기, 제어계통, 인터록까지 포함해 실제 운전과 유지관리에 직접 쓰는 상세 도면이다.",
  "Plot Plan": "설비와 건물의 배치, 거리, 동선, 이격거리 등을 평면상에 나타내는 배치도이다.",
  "Layout Drawing": "설비나 구조물의 배치와 공간 구성을 보여 주는 도면으로, 설치 위치와 공간 활용을 확인할 때 쓴다.",
  "운전 및 설계 조건": "온도, 압력, 유량처럼 공정을 안전하게 설계하고 운전하기 위한 기본 조건을 말한다.",
  "화학반응식과 반응조건": "주요 반응의 화학식, 반응온도, 압력, 촉매 조건 등을 정리한 정보로 공정 이해의 기본이 된다.",
  "이상반응 여부 및 대책": "폭주반응이나 부반응처럼 비정상 반응 가능성과 그에 대한 대응방안을 정리한 내용이다.",
  "비상조치절차서": "누출, 화재, 폭발 같은 비상상황이 발생했을 때 현장이 따라야 할 대응 절차를 문서화한 것이다.",
  "체크 밸브": "유체가 한 방향으로만 흐르도록 해 역류를 방지하는 밸브다.",
  "컨트롤 밸브": "계기 신호를 받아 유량, 압력, 온도, 액위 같은 공정 변수를 자동으로 조절하는 밸브다.",
  "릴리프 밸브": "설비 압력이 설정값을 넘을 때 자동으로 열려 과압을 방지하는 안전밸브 계열 장치다.",
  "게이트 밸브": "유로를 완전히 열거나 닫는 개폐용 밸브로, 미세한 유량 조절용으로는 적합하지 않다.",
  "0종 장소": "정상 상태에서도 폭발성 가스 분위기가 지속적으로 존재하거나 장시간 존재하는 장소다.",
  "1종 장소": "정상 운전 중 폭발성 가스 분위기가 생성될 가능성이 있는 장소다.",
  "2종 장소": "정상 운전 중에는 폭발성 가스 분위기가 거의 없고, 생기더라도 짧은 시간만 존재하는 장소다.",
  "비위험 장소": "폭발성 가스 분위기가 존재할 가능성이 없어 일반 전기기기를 사용할 수 있는 장소다.",
  "HAZOP": "공정변수와 가이드워드를 이용해 설계의도에서 벗어나는 이탈을 찾고, 그 원인과 결과를 체계적으로 검토하는 대표적 정성적 기법이다.",
  "JSA": "작업을 단계별로 나누어 각 단계의 위험요인과 안전대책을 검토하는 작업 중심 분석기법이다.",
  "HEA": "사람의 실수나 휴먼에러 가능성을 분석해 사고 원인과 예방대책을 찾는 인간공학적 접근이다.",
  "ETA": "초기 사건이 발생한 뒤 방호계층의 성공과 실패에 따라 결과가 어떻게 전개되는지 분석하는 기법이다.",
  "FTA": "정상사건에서 출발해 원인이 되는 하위사건을 논리게이트로 전개하여 사고 원인을 분석하는 정량적 기법이다.",
  "FMECA": "고장 형태와 그 영향, 치명도를 함께 분석해 어떤 고장이 더 위험한지 우선순위를 정하는 기법이다.",
  "What-if 기법": "만약 어떤 일이 일어나면 어떻게 될지를 질문 형식으로 던지며 위험요인을 찾는 비교적 간단한 검토기법이다.",
  "체크리스트법": "미리 정한 점검 항목을 기준으로 빠짐없이 확인하는 기법으로, 항목만 정해지면 현장에서 적용이 쉽다.",
  "LOPA": "사고 시나리오별로 독립보호계층의 수준이 충분한지 반정량적으로 평가하는 기법이다.",
  "SIL JSA": "안전무결성 수준 개념과 작업위험분석을 함께 떠올리게 하는 표현이지만, HAZOP처럼 공정 이탈을 체계적으로 검토하는 대표 기법과는 다르다.",
  "K-PSR": "국내 공정안전보고서 제도와 관련된 표현으로, 개별 공정의 위험요소와 운전성 문제를 찾는 HAZOP 자체를 뜻하지는 않는다.",
  "공정안전자료": "취급물질, 설비 사양, 공정 흐름, 안전장치 등 PSM 운영의 기초가 되는 기술자료를 말한다.",
  "비상조치계획": "비상상황 발생 시 조직, 연락, 대피, 초기대응, 복구 절차를 미리 정해 둔 계획이다.",
  "안전운전지침(절차)서": "정상운전, 비정상운전, 기동, 정지, 비상조치까지 포함해 운전자가 따라야 할 안전 운전 절차를 정리한 문서다.",
  "작업허가서": "화기작업, 밀폐공간작업 같은 고위험 작업을 시작하기 전에 필요한 안전조치를 확인하고 승인하는 문서다.",
  "공정개요서": "공정의 목적, 조건, 반응, 주요 위험요인 등 공정 전반을 개괄적으로 설명하는 문서다.",
  "변경요소관리": "설비, 공정, 원료, 운전방법 등이 바뀔 때 새 위험요소가 생기지 않도록 사전에 검토하고 승인하는 절차다.",
  "변경요소 관리": "설비, 공정, 원료, 운전방법 등이 바뀔 때 새 위험요소가 생기지 않도록 사전에 검토하고 승인하는 절차다.",
  "위험성 평가": "어떤 위험이 어디에 있고, 얼마나 큰 피해로 이어질 수 있으며, 어떻게 줄일지를 체계적으로 검토하는 활동이다.",
  "자체감사": "사업장 스스로 PSM 운영 상태를 점검해 미흡한 부분을 찾아 개선하는 내부 점검 활동이다.",
  "공정사고": "화재, 폭발, 누출처럼 공정설비와 직접 관련되어 사람, 설비, 환경에 피해를 줄 수 있는 사고다.",
  "동종업종에서 발생한 공정사고": "유사 공정에서 발생한 사례로, 같은 유형의 위험을 예방하기 위한 학습 자료가 된다.",
  "출퇴근 중 발생한 사고": "사업장 공정 자체와 직접 연결된 공정사고로 보기 어려워 PSM 사고조사 범주와는 성격이 다르다.",
  "MSDS 교육": "물질안전보건자료를 바탕으로 유해성, 취급방법, 저장방법, 누출 시 조치, 응급처치 등을 교육하는 것이다.",
  "일반 교양교육": "직무와 직접 연결되지 않은 일반 소양 중심 교육으로, 화학물질 취급 위험정보 교육과는 목적이 다르다.",
  "내압방폭": "기기 내부 폭발이 발생해도 외함이 그 압력을 견디고 화염이 외부 위험분위기로 전파되지 않도록 한 방폭 구조다.",
  "안전증방폭": "정상 운전 중 아크, 스파크, 과열이 생기지 않도록 구조를 강화해 점화 가능성을 낮춘 방폭 방식이다.",
  "본질안전방폭": "회로 에너지를 점화가 일어나지 않을 수준 이하로 제한하는 방식으로, 계장회로와 계측기기에 많이 적용된다.",
  "밀폐공간 내부": "환기 불량과 유해가스 축적 가능성이 커서 산소농도와 유해가스 농도 측정이 우선적으로 필요한 장소다.",
  "환기가 불충분한 작업장": "공기 교환이 잘 되지 않아 유해가스가 쌓일 수 있으므로 작업 전 측정과 환기 조치가 중요하다.",
  "유해가스가 체류할 우려가 있는 장소": "가스가 머무를 가능성이 있으므로 농도 측정 없이는 안전 여부를 판단하기 어렵다.",
  "유해기준 이하이며 통풍이 충분한 장소": "충분한 환기와 안전 농도가 확보된 상태라면 상대적으로 측정의 우선순위가 낮다.",
  "개인보급용 보호구이다": "방독면은 작업자 개인에게 지급해 사용하는 대표적인 호흡보호구다.",
  "유해가스를 걸러내는 정화통이 부착될 수 있다": "방독면은 정화통을 통해 특정 유해가스를 걸러 사용하지만, 산소를 만들어 주지는 못한다.",
  "산소농도 18% 미만 장소에서는 사용하면 안 된다": "방독면은 정화식 보호구이므로 산소결핍 장소에서는 사용할 수 없고 공기호흡기 등이 필요하다.",
  "산소농도 18% 미만 장소에서도 사용할 수 있다": "이 설명은 틀리다. 산소결핍 장소에서는 방독면이 아니라 공기호흡기나 송기식 보호구를 써야 한다.",
  "공기호흡기": "압축공기를 등에 지고 들어가 외부 공기와 무관하게 호흡할 수 있는 자급식 호흡보호구다."
};

function isChoiceLine(line) {
  return /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(line.trim());
}

function hasBoilerplate(line) {
  return boilerplateFragments.some((fragment) => line.includes(fragment));
}

function splitExplanation(explanation) {
  const normalized = (explanation || "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return { intro: "", choiceLines: [] };
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const introLines = [];
  const choiceLines = [];

  for (const line of lines) {
    if (!line || line === "오답 보기") {
      continue;
    }

    if (isChoiceLine(line)) {
      choiceLines.push(line);
    } else {
      introLines.push(line);
    }
  }

  return { intro: introLines.join(" ").trim(), choiceLines };
}

function buildChoiceLine(choice) {
  const concept = conceptGlossary[choice.text];
  if (!concept) {
    return null;
  }

  return `${choice.label} ${choice.text}: ${concept}`;
}

function topicParticle(text) {
  const trimmed = (text || "").trim();
  const lastChar = trimmed.slice(-1);

  if (!lastChar) {
    return "는";
  }

  const code = lastChar.charCodeAt(0);
  const hangulBase = 0xac00;
  const hangulEnd = 0xd7a3;

  if (code < hangulBase || code > hangulEnd) {
    return "는";
  }

  return (code - hangulBase) % 28 === 0 ? "는" : "은";
}

function main() {
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let updated = 0;

  for (const question of json.questions) {
    const { intro, choiceLines } = splitExplanation(question.explanation);
    const wrongChoices = question.choices.filter((choice) => choice.label !== question.answer.label);
    const generatedWrongLines = wrongChoices
      .map(buildChoiceLine)
      .filter(Boolean);

    if (generatedWrongLines.length === 0) {
      continue;
    }

    const hasBoilerplateChoiceLines = choiceLines.some(hasBoilerplate);
    const shouldEnhance = hasBoilerplateChoiceLines || choiceLines.length === 0 || !intro;

    if (!shouldEnhance) {
      continue;
    }

    let nextIntro = intro;
    const answerConcept = conceptGlossary[question.answer.text];

    if (!nextIntro && answerConcept) {
      nextIntro = `${question.answer.text}${topicParticle(question.answer.text)} ${answerConcept}`;
    }

    if (!nextIntro) {
      continue;
    }

    const nextExplanation = `${nextIntro}\n\n${generatedWrongLines.join("\n")}`.trim();

    if (nextExplanation !== question.explanation) {
      question.explanation = nextExplanation;
      updated += 1;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");
  console.log(`enhanced_explanations=${updated}`);
}

main();
