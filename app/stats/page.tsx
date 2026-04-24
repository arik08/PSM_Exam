import { Shell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import {
  HiddenQuestionsResetButton,
  StatsResetButton,
  WrongQuestionsResetButton
} from "@/components/stats-reset-button";
import { fetchStatsPayload } from "@/lib/api";
import { formatKoreanDate, toPercent } from "@/lib/utils";

export default async function StatsPage() {
  const { progress, wrongQuestions } = await fetchStatsPayload();

  return (
    <Shell
      eyebrow="Practice Log"
      title="OPIc 연습 통계"
      description="완료율, 모의시험 질문 진도, 이어 연습 위치를 한 화면에서 확인할 수 있습니다."
      actions={
        <div className="flex flex-wrap gap-2">
          <HiddenQuestionsResetButton />
          <StatsResetButton />
        </div>
      }
      compact
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 연습"
          value={`${progress.totalSolved}개`}
          hint="중복 평가를 제외한 고유 질문 수"
        />
        <StatCard
          label="완료율"
          value={toPercent(progress.accuracy)}
          hint="응답 완료로 저장한 비율"
          accent="pine"
        />
        <StatCard
          label="전체 항목"
          value={`${progress.totalQuestions}개`}
          hint="JSON에 등록된 총 연습 항목"
          accent="rose"
        />
        <StatCard
          label="모의시험 진행"
          value={`${progress.pastExamSolved}/${progress.pastExamCount}`}
          hint="실전형 질문만 기준으로 집계"
        />
      </div>

      <section className="mt-8">
        <article className="rounded-[15px] border border-black/8 bg-white/80 p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Resume</p>
          <h2 className="mt-3 font-serif text-3xl text-ink">이어 연습 상태</h2>
          <p className="mt-3 text-sm leading-7 text-ink/70">
            마지막 질문 ID는 <strong>{progress.resumeQuestionId ?? "없음"}</strong> 입니다.
          </p>
          <p className="mt-2 text-sm text-ink/70">
            마지막 연습 모드는 <strong>{progress.preferences.lastMode}</strong> 입니다.
          </p>
        </article>
      </section>

      <section className="mt-8">
        <article className="rounded-[15px] border border-black/8 bg-white/80 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Saved Review</p>
              <h2 className="mt-3 font-serif text-3xl text-ink">이전 복습 기록</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-[10px] border border-black/10 px-3 py-1 text-xs text-ink/60">
                {wrongQuestions.length}개
              </span>
              {wrongQuestions.length ? <WrongQuestionsResetButton /> : null}
            </div>
          </div>

          {wrongQuestions.length ? (
            <div className="mt-5 grid gap-3">
              {wrongQuestions.map((question) => (
                <div
                  key={question.questionId}
                  className="rounded-[11px] border border-black/8 bg-sand/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-[10px] border border-black/10 px-2.5 py-1 text-ink/60">
                      {question.sourceSection}
                    </span>
                    {question.isPastExam ? (
                      <span className="rounded-[10px] border border-gold/20 bg-gold/10 px-2.5 py-1 text-gold">
                        모의시험
                      </span>
                    ) : null}
                    <span className="rounded-[10px] border border-rose/20 bg-rose/10 px-2.5 py-1 text-rose">
                      {question.wrongCount}회 다시 연습 표시
                    </span>
                    <span className="rounded-[10px] border border-black/10 px-2.5 py-1 text-ink/55">
                      {question.status === "active" ? "다시 연습 필요" : "Ready 처리됨"}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-medium leading-7 text-ink">{question.prompt}</p>
                  <div className="mt-3 grid gap-2">
                    {question.choices.map((choice) => {
                      const isAnswer = choice.label === question.answerLabel;

                      return (
                        <div
                          key={`${question.questionId}-${choice.label}`}
                          className={`rounded-[10px] border px-3 py-2 text-sm leading-6 ${
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
                    목표 기준: <strong>{question.answerLabel ? `${question.answerLabel} ` : ""}{question.answerText}</strong>
                  </p>
                  <p className="mt-1 text-xs text-ink/48">
                    최근 표시: {formatKoreanDate(question.lastWrongAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/65">아직 복습 목록에 남은 항목이 없습니다.</p>
          )}
        </article>
      </section>
    </Shell>
  );
}
