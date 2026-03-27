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
  const mode = (params.mode as StudyMode) || "all";
  const reviewFilter = (params.review as ReviewFilter) || "active";
  const order = (params.order as OrderMode) || "sequential";
  const orderSeed =
    params.orderSeed && params.orderSeed.trim()
      ? params.orderSeed
      : `${mode}:${reviewFilter}:default-random-order`;
  const studyPayload = await fetchStudyPayload(mode, 0, reviewFilter);

  return (
    <Shell
      eyebrow="학습 모드"
      title="문제 풀이"
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
