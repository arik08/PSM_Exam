import { Shell } from "@/components/shell";
import { StudyClient } from "@/components/study-client";
import { fetchStudyPayload } from "@/lib/api";
import { OrderMode, ReviewFilter, StudyMode } from "@/lib/types";

export default async function StudyPage({
  searchParams
}: {
  searchParams: Promise<{
    mode?: string;
    review?: string;
    resume?: string;
    order?: string;
    orderSeed?: string;
  }>;
}) {
  const params = await searchParams;
  const mode = ((params.mode === "past" ? "speaking" : params.mode) as StudyMode) || "speaking";
  const reviewFilter = (params.review as ReviewFilter) || "active";
  const order = (params.order as OrderMode) || "sequential";
  const orderSeed =
    params.orderSeed && params.orderSeed.trim()
      ? params.orderSeed
      : `${mode}:${reviewFilter}:default-random-order`;
  const studyPayload = await fetchStudyPayload(mode, 0, reviewFilter);

  return (
    <Shell
      eyebrow="Speaking Practice"
      title="OPIc 답변 연습"
      compact
    >
      <StudyClient
        initialMode={mode}
        initialReviewFilter={reviewFilter}
        initialOrder={order}
        initialOrderSeed={orderSeed}
        initialData={studyPayload.questionPayload}
        initialProgress={studyPayload.progress}
        resume={params.resume === "1"}
      />
    </Shell>
  );
}
