# PSM Exam Study

`1.questions.json`을 데이터 소스로 사용하는 Next.js 기반 PSM 학습 앱입니다.  
문제 풀이, 기출 필터, 오답 복습, 통계 확인을 한 서비스 안에서 사용할 수 있습니다.

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

### 3. GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-account>/<your-repo>.git
git push -u origin main
```

### 4. Vercel 연결

1. Vercel에서 `Add New Project`
2. GitHub 저장소 선택
3. 환경변수 3개 등록
4. Deploy

### 5. 배포 후 확인

- 문제 풀이 제출이 되는지
- 통계 페이지가 열리는지
- 오답 기록 초기화가 동작하는지
- 새로고침 후 이어풀기가 유지되는지

## Notes

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀키이므로 GitHub에 올리면 안 됩니다.
- 환경변수가 없으면 앱은 자동으로 로컬 파일 저장소 fallback을 사용합니다.
