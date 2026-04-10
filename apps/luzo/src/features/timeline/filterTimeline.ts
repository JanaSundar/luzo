import type { TimelineFilterInput, TimelineFilterOutput } from "@/types/worker-results";

export function filterTimeline(input: TimelineFilterInput): TimelineFilterOutput {
  const filters: string[][] = [];

  if (input.stepIds?.length) {
    filters.push(input.stepIds.flatMap((stepId) => input.index.byStepId[stepId] ?? []));
  }
  if (input.statuses?.length) {
    filters.push(input.statuses.flatMap((status) => input.index.byStatus[status] ?? []));
  }
  if (input.branchIds?.length) {
    filters.push(input.branchIds.flatMap((branchId) => input.index.byBranchId[branchId] ?? []));
  }
  if (input.attemptKeys?.length) {
    filters.push(
      input.attemptKeys.flatMap((attemptKey) => input.index.byAttempt[attemptKey] ?? []),
    );
  }

  const candidateIds =
    filters.length === 0
      ? input.index.orderedEventIds
      : intersect(filters).filter((eventId) =>
          withinRange(input, input.index.byId[eventId]?.timestamp),
        );

  return {
    eventIds: candidateIds,
    events: candidateIds
      .map((eventId) => input.index.byId[eventId])
      .filter((event): event is NonNullable<typeof event> => Boolean(event)),
  };
}

function intersect(values: string[][]): string[] {
  if (values.length === 0) return [];
  const counts = new Map<string, number>();
  for (const group of values) {
    for (const value of new Set(group)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count === values.length)
    .map(([value]) => value);
}

function withinRange(input: TimelineFilterInput, timestamp?: number) {
  if (timestamp == null || !input.timeRange) return true;
  if (input.timeRange.from != null && timestamp < input.timeRange.from) return false;
  if (input.timeRange.to != null && timestamp > input.timeRange.to) return false;
  return true;
}
