import { Shell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { ModeLink } from "@/components/mode-link";
import { fetchProgress } from "@/lib/api";
import { toPercent } from "@/lib/utils";

export default async function HomePage() {
  const progress = await fetchProgress();

  return (
    <Shell
      eyebrow="Focused Learning Workspace"
      title="PSM 문제 풀이와 복습을 한 곳에서"
      description="기출 학습부터 오답 복습까지, 반복 학습에 맞춘 PSM 문제 풀이 서비스를 경험해 보세요."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="진행률"
          value={`${progress.totalSolved}/${progress.totalQuestions}`}
          hint="한 번이라도 제출한 문항 수"
          accent="pine"
        />
        <StatCard
          label="정답률"
          value={toPercent(progress.accuracy)}
          hint={`${progress.correctCount}개 정답 / ${progress.wrongCount}개 오답`}
        />
        <StatCard
          label="오답 복습"
          value={`${progress.activeReviewCount}문항`}
          hint="현재 active 상태의 복습 카드"
          accent="rose"
        />
        <StatCard
          label="기출 풀이"
          value={`${progress.pastExamSolved}/${progress.pastExamCount}`}
          hint="기출 문제만 따로 집계"
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <ModeLink
          href={
            progress.resumeQuestionId
              ? `/study?mode=${progress.preferences.lastMode}&resume=1`
              : "/study?mode=all"
          }
          title="이어풀기"
          badge="Resume"
          body="마지막으로 보던 문제부터 바로 이어서 풉니다."
        />
        <ModeLink
          href="/study?mode=all"
          title="전체 문제 풀이"
          badge="All Questions"
          body="109문항 전체를 순서대로 풀며 학습 기록을 쌓습니다."
        />
        <ModeLink
          href="/study?mode=review"
          title="오답 복습"
          badge="Review"
          body="틀린 문제만 자동으로 모아서 다시 풀고 active 상태를 관리합니다."
        />
        <ModeLink
          href="/study?mode=past"
          title="기출만 보기"
          badge="Past Exam"
          body="기출 표시가 있는 문제만 모아 시험 감각으로 복습합니다."
        />
      </section>

      <section className="mt-8">
        <article className="rounded-[32px] border border-[#0b4f95]/20 bg-[#0f4f91] p-6 text-white shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Stats View</p>
          <h2 className="mt-3 font-serif text-3xl">통계 보기</h2>
          <p className="mt-3 text-sm leading-7 text-white/72">
            누적 정답률, 최근 오답, 기출 풀이율, 마지막 학습 모드를 한 번에 점검할 수 있습니다.
          </p>
          <a
            href="/stats"
            className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-ink"
          >
            통계 열기
          </a>
        </article>
      </section>
    </Shell>
  );
}
