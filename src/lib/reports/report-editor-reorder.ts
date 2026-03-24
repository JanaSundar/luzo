import type { StructuredReport } from "@/types/pipeline-debug";

export function updateReportRequestOrder(
  report: StructuredReport,
  orderedStepIds: string[],
): StructuredReport {
  const requestMap = new Map(report.requests.map((request) => [request.stepId, request]));
  const orderedRequests = orderedStepIds
    .map((stepId) => requestMap.get(stepId))
    .filter((request) => request !== undefined);

  const remainingRequests = report.requests.filter(
    (request) => !orderedStepIds.includes(request.stepId),
  );

  return {
    ...report,
    requests: [...orderedRequests, ...remainingRequests],
  };
}
