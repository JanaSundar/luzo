export function collectionToPipelineHref(collectionId: string) {
  const params = new URLSearchParams({
    generateFromCollection: collectionId,
  });
  return `/pipelines?${params.toString()}`;
}
