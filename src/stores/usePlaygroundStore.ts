import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ApiRequest, HttpMethod, ResponseLayout, SavedRequest } from "@/types";

export const PLAYGROUND_STORAGE_KEY = "luzo-playground-store";

/** Strip auth credentials from request before persistence */
function sanitizeRequestForPersistence(req: ApiRequest): ApiRequest {
  const auth = req.auth;
  if (auth.type === "bearer" && auth.bearer?.token) {
    return { ...req, auth: { ...auth, bearer: { token: "" } } };
  }
  if (auth.type === "basic" && auth.basic) {
    return { ...req, auth: { ...auth, basic: { username: auth.basic.username, password: "" } } };
  }
  if (auth.type === "api-key" && auth.apiKey) {
    return { ...req, auth: { ...auth, apiKey: { ...auth.apiKey, value: "" } } };
  }
  return req;
}

const DEFAULT_REQUEST: ApiRequest = {
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  params: [{ key: "", value: "", enabled: true }],
  body: null,
  bodyType: "none",
  formDataFields: [],
  auth: { type: "none" },
  preRequestEditorType: "visual",
  postRequestEditorType: "visual",
  testEditorType: "visual",
  preRequestRules: [],
  postRequestRules: [],
  testRules: [],
  postRequestScript: "",
};

interface PlaygroundState {
  linkedSavedRequest: {
    autoSave: boolean;
    collectionId: string;
    id: string;
    name: string;
    persistResponse: boolean;
  } | null;
  request: ApiRequest;
  originalRequest: ApiRequest | null; // Track last loaded/saved request for dirty detection
  responseLayout: ResponseLayout;

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setRequest: (request: Partial<ApiRequest>) => void;
  setLoadedRequest: (request: SavedRequest | ApiRequest) => void; // Call when loading from collection
  setLinkedSavedRequest: (linkedSavedRequest: PlaygroundState["linkedSavedRequest"] | null) => void;
  markRequestPersisted: (request: ApiRequest) => void;
  resetRequest: () => void;
  setResponseLayout: (layout: ResponseLayout) => void;
}

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    immer<PlaygroundState>((set) => ({
      linkedSavedRequest: null,
      request: DEFAULT_REQUEST,
      originalRequest: null,
      responseLayout: "horizontal",

      setMethod: (method) =>
        set((state) => {
          state.request.method = method;
        }),

      setUrl: (url) =>
        set((state) => {
          state.request.url = url;
        }),

      setRequest: (partial) =>
        set((state) => {
          state.request = { ...state.request, ...partial };
        }),

      setLoadedRequest: (request) =>
        set((state) => {
          if ("request" in request) {
            state.request = request.request;
            state.originalRequest = request.request;
            state.linkedSavedRequest = request.collectionId
              ? {
                  id: request.id,
                  collectionId: request.collectionId,
                  name: request.name,
                  persistResponse: request.persistResponse ?? false,
                  autoSave: request.autoSave ?? false,
                }
              : null;
            return;
          }
          state.request = request;
          state.originalRequest = request;
          state.linkedSavedRequest = null;
        }),

      setLinkedSavedRequest: (linkedSavedRequest) =>
        set((state) => {
          state.linkedSavedRequest = linkedSavedRequest;
        }),

      markRequestPersisted: (request) =>
        set((state) => {
          state.originalRequest = request;
        }),

      resetRequest: () =>
        set((state) => {
          state.request = DEFAULT_REQUEST;
          state.originalRequest = null;
          state.linkedSavedRequest = null;
        }),

      setResponseLayout: (responseLayout) =>
        set((state) => {
          state.responseLayout = responseLayout;
        }),
    })),
    {
      name: PLAYGROUND_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PlaygroundState> | undefined;
        return {
          ...currentState,
          ...persisted,
          responseLayout: "horizontal",
        };
      },
      partialize: (s) => {
        const req = s.request;
        const formDataFields = req.formDataFields?.map((f) => ({
          ...f,
          file: undefined,
        }));
        const sanitizedReq = sanitizeRequestForPersistence({ ...req, formDataFields });
        return {
          request: sanitizedReq,
          originalRequest: s.originalRequest,
          linkedSavedRequest: s.linkedSavedRequest,
        };
      },
    },
  ),
);
