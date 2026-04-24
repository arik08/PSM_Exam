# OPIc English Coach

`1.questions.json`을 데이터 소스로 사용하는 Next.js 기반 OPIc 영어 말하기 연습 앱입니다.
OPIc 모의시험, 문장 전환, 영단어 테스트, 연습 통계를 한 서비스 안에서 사용할 수 있습니다.

## 학습 흐름

1. OPIc 질문은 타이머를 켜고 45-90초 동안 직접 영어로 답변합니다.
2. `응답 완료`를 누르면 샘플 답변, 유용한 표현, 체크리스트가 열립니다.
3. 문장 전환 문제는 한 문장 세트를 `영어->한국어`, `한국어->영어` 양방향 모드에서 함께 사용합니다.
4. 영단어 테스트도 한 단어 세트를 `영어->한국어`, `한국어->영어` 양방향 모드에서 함께 사용합니다.

## JSON 콘텐츠 구조

앱은 `1.questions.json`의 `questions` 배열을 그대로 읽습니다. 항목을 추가, 삭제, 수정하면 서버 재시작 또는 새로고침 후 화면에 반영됩니다.

필수 필드:

- `id`: 고유 ID입니다. 기존 기록과 연결되므로 한 번 사용한 항목은 가능하면 유지하세요.
- `number`: 화면 정렬용 번호입니다.
- `activity_type`: `speaking`, `translation-pair`, `vocab-pair` 중 하나입니다.
- `source_section`: 화면에 표시되는 분류입니다.
- `is_past_exam`: `true`면 모의시험 모드에 포함됩니다.
- `question`: `speaking`에서 사용자에게 보여줄 질문입니다.
- `question_context`: `speaking`에서 보여줄 짧은 안내 문구입니다.
- `english`: `translation-pair`, `vocab-pair`에서 영어 문장 또는 단어입니다.
- `korean`: `translation-pair`, `vocab-pair`에서 한국어 문장 또는 뜻입니다.
- `answer.text`: `speaking`에서 응답 완료 후 보여줄 샘플 답변입니다.
- `explanation`: 해설, 표현, 체크리스트입니다.

예시:

```json
{
  "id": "vocab-006",
  "number": 16,
  "activity_type": "vocab-pair",
  "source_section": "Vocabulary Pair",
  "is_past_exam": false,
  "english": "comfortable",
  "korean": "익숙한, 편안한",
  "explanation": "Example: I want to become more comfortable speaking English."
}
```

## Local Run

```bash
npm install
npm run dev
```

기본값은 로컬 파일 저장소(`.app-data/study-db.json`)를 사용합니다.

## Vercel + Supabase 배포

Vercel에 배포할 때는 로컬 파일 저장소 대신 Supabase를 쓰는 것을 권장합니다.

### 1. Supabase 프로젝트 생성

Supabase에서 새 프로젝트를 만든 뒤 SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.

생성되는 테이블:

- `anonymous_sessions`
- `user_preferences`
- `question_attempts`
- `review_items`

### 2. 환경변수 설정

`.env.example`를 참고해서 아래 값을 설정합니다.

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

로컬에서는 `.env.local`, Vercel에서는 Project Settings > Environment Variables에 같은 값을 넣으면 됩니다.

## 배포 후 확인

- 응답 완료 기록이 저장되는지
- 통계 페이지가 열리는지
- 연습 기록 초기화가 동작하는지
- 새로고침 후 이어 연습이 유지되는지

## Notes

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀키이므로 GitHub에 올리면 안 됩니다.
- 환경변수가 없으면 앱은 자동으로 로컬 파일 저장소 fallback을 사용합니다.
