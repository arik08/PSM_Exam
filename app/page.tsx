import { Shell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { ModeLink } from "@/components/mode-link";
import { fetchProgress } from "@/lib/api";
import { toPercent } from "@/lib/utils";

export default async function HomePage() {
  const progress = await fetchProgress();
  const resumeMode =
    progress.preferences.lastMode === "review" || progress.preferences.lastMode === "all"
      ? "speaking"
      : progress.preferences.lastMode;

  return (
    <Shell
      eyebrow="OPIc Study Home"
      title="영어 답변 연습과 복습"
      description="OPIc 말하기는 타이머로 연습하고, 문장 번역과 단어 테스트는 답을 떠올린 뒤 정답을 확인합니다."
      compact
    >
      <section className="grid gap-3 lg:grid-cols-2">
        <ModeLink
          href={
            progress.resumeQuestionId
              ? `/study?mode=${resumeMode}&resume=1`
              : "/study?mode=speaking"
          }
          title="이어 연습하기"
          badge="Resume"
          body="마지막으로 보던 OPIc 질문부터 바로 이어서 연습합니다."
        />
        <ModeLink
          href="/study?mode=speaking"
          title="OPIc 모의시험"
          badge="Speaking"
          body="타이머를 켜고 실전 질문에 답변한 뒤, 샘플 답변을 확인합니다."
        />
        <ModeLink
          href="/study?mode=sentence-en-ko"
          title="문장: 영어 → 한국어"
          badge="EN to KO"
          body="영어 문장을 보고 자연스러운 한국어 뜻을 떠올린 뒤 정답을 확인합니다."
        />
        <ModeLink
          href="/study?mode=sentence-ko-en"
          title="문장: 한국어 → 영어"
          badge="KO to EN"
          body="한국어 문장을 보고 영어 표현을 떠올린 뒤 정답을 확인합니다."
        />
        <ModeLink
          href="/study?mode=vocab-en-ko"
          title="단어: 영어 → 한국어"
          badge="Word EN to KO"
          body="영단어를 보고 한국어 뜻을 떠올립니다."
        />
        <ModeLink
          href="/study?mode=vocab-ko-en"
          title="단어: 한국어 → 영어"
          badge="Word KO to EN"
          body="한국어 뜻을 보고 맞는 영단어를 떠올립니다."
        />
      </section>

      <section className="mt-4">
        <a href="/stats" className="block">
          <article className="rounded-[14px] border border-[#0b4f95]/20 bg-[#0f4f91] p-5 text-white shadow-soft transition hover:-translate-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Practice Log</p>
            <h2 className="mt-2 font-serif text-2xl sm:text-[1.8rem]">연습 기록 보기</h2>
            <p className="mt-2 text-sm leading-6 text-white/72">
              전체 완료율, 모의시험 질문 진행률, 마지막 연습 위치를 한 번에 확인합니다.
            </p>
          </article>
        </a>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="완료 진행"
          value={`${progress.totalSolved}/${progress.totalQuestions}`}
          hint="한 번이라도 응답 완료한 항목 수"
          accent="pine"
        />
        <StatCard
          label="완료율"
          value={toPercent(progress.accuracy)}
          hint={`${progress.correctCount}개 완료`}
        />
        <StatCard
          label="전체 항목"
          value={`${progress.totalQuestions}개`}
          hint="JSON에 등록된 말하기, 문장, 단어 항목"
          accent="rose"
        />
        <StatCard
          label="모의시험"
          value={`${progress.pastExamSolved}/${progress.pastExamCount}`}
          hint="실전형 질문만 따로 집계"
        />
      </section>
    </Shell>
  );
}
