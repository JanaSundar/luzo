import type { ApiRequest } from "@/types";

/**
 * Common interface for items that can be exported to Postman/OpenAPI.
 * Works with both PipelineStep and SavedRequest.
 */
export interface ExportableRequest extends ApiRequest {
  name: string;
}

export interface ExportableCollection {
  name: string;
  description?: string;
  items: ExportableRequest[];
}
