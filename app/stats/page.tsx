import { Shell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { StatsResetButton, WrongQuestionsResetButton } from "@/components/stats-reset-button";
import { fetchProgress, fetchWrongQuestions } from "@/lib/api";
import { formatKoreanDate, toPercent } from "@/lib/utils";

export default async function StatsPage() {
  const progress = await fetchProgress();
  const wrongQuestions = await fetchWrongQuestions();

  return (
    <Shell
      eyebrow="기록 보기"
      title="학습 통계"
      description="누적 정확도와 기출 진도, 이어풀기 위치, 자주 틀리는 문제를 한 화면에서 확인할 수 있습니다."
      actions={<StatsResetButton />}
      compact
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 풀이"
          value={`${progress.totalSolved}문항`}
          hint="중복 제출을 제외한 고유 문항 수"
        />
        <StatCard
          label="정답률"
          value={toPercent(progress.accuracy)}
          hint="제출 기록 기준 전체 정확도"
          accent="pine"
        />
        <StatCard
          label="오답 Active"
          value={`${progress.activeReviewCount}문항`}
          hint="현재 복습이 필요한 문제 수"
          accent="rose"
        />
        <StatCard
          label="기출 진행"
          value={`${progress.pastExamSolved}/${progress.pastExamCount}`}
          hint="기출 문제만 기준으로 집계"
        />
      </div>

      <section className="mt-8">
        <article className="rounded-[30px] border border-black/8 bg-white/80 p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Resume</p>
          <h2 className="mt-3 font-serif text-3xl text-ink">이어풀기 상태</h2>
          <p className="mt-3 text-sm leading-7 text-ink/70">
            마지막 문제 ID는 <strong>{progress.resumeQuestionId ?? "없음"}</strong> 입니다.
          </p>
          <p className="mt-2 text-sm text-ink/70">
            마지막 학습 모드는 <strong>{progress.preferences.lastMode}</strong> 입니다.
          </p>
        </article>
      </section>

      <section className="mt-8">
        <article className="rounded-[30px] border border-black/8 bg-white/80 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Wrong Questions</p>
              <h2 className="mt-3 font-serif text-3xl text-ink">내가 자주 틀리는 문제</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-ink/60">
                {wrongQuestions.length}문항
              </span>
              {wrongQuestions.length ? <WrongQuestionsResetButton /> : null}
            </div>
          </div>

          {wrongQuestions.length ? (
            <div className="mt-5 grid gap-3">
              {wrongQuestions.map((question) => (
                <div
                  key={question.questionId}
                  className="rounded-[22px] border border-black/8 bg-sand/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-black/10 px-2.5 py-1 text-ink/60">
                      {question.sourceSection}
                    </span>
                    {question.isPastExam ? (
                      <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-gold">
                        기출
                      </span>
                    ) : null}
                    <span className="rounded-full border border-rose/20 bg-rose/10 px-2.5 py-1 text-rose">
                      {question.wrongCount}회 틀림
                    </span>
                    <span className="rounded-full border border-black/10 px-2.5 py-1 text-ink/55">
                      {question.status === "active" ? "복습 필요" : "해결됨"}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-medium leading-7 text-ink">{question.prompt}</p>
                  <div className="mt-3 grid gap-2">
                    {question.choices.map((choice) => {
                      const isAnswer = choice.label === question.answerLabel;

                      return (
                        <div
                          key={`${question.questionId}-${choice.label}`}
                          className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
                            isAnswer
                              ? "border-black/8 bg-white/70 text-[#0000FF]"
                              : "border-black/8 bg-white/70 text-ink/72"
                          }`}
                        >
                          <span className="font-semibold">{choice.label}</span> {choice.text}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-sm text-ink/65">
                    정답: <strong>{question.answerLabel ? `${question.answerLabel} ` : ""}{question.answerText}</strong>
                  </p>
                  <p className="mt-1 text-xs text-ink/48">
                    최근 오답: {formatKoreanDate(question.lastWrongAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/65">아직 기록된 오답 문제가 없습니다.</p>
          )}
        </article>
      </section>
    </Shell>
  );
}
