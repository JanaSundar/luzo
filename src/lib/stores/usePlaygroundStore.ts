import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ApiRequest,
  ApiResponse,
  Environment,
  HttpMethod,
  KeyValuePair,
  ResponseLayout,
} from "@/types";

export const STORAGE_KEY = "playground-store";

/** Keys that indicate sensitive values - these are not persisted to localStorage */
const SENSITIVE_KEY_PATTERN =
  /^(password|token|secret|api[_-]?key|bearer|credential|private[_-]?key|access[_-]?key|secret[_-]?key|auth|authorization)$/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key?.trim() ?? "");
}

/** Strip sensitive variable values before persistence - keys preserved, values cleared */
function sanitizeEnvironmentsForPersistence(environments: Environment[]): Environment[] {
  return environments.map((env) => ({
    ...env,
    variables: env.variables.map((v) => (isSensitiveKey(v.key) ? { ...v, value: "" } : v)),
  }));
}

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

/** Read persisted layout synchronously to avoid hydration flicker */
export function getPersistedLayout(): ResponseLayout {
  if (typeof window === "undefined") return "horizontal";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { responseLayout?: ResponseLayout } };
      const layout = parsed?.state?.responseLayout;
      if (layout === "vertical" || layout === "horizontal") return layout;
    }
  } catch {
    /* ignore */
  }
  return "horizontal";
}

const DEFAULT_REQUEST: ApiRequest = {
  method: "GET",
  url: "",
  headers: [],
  params: [],
  body: null,
  bodyType: "none",
  formDataFields: [],
  auth: { type: "none" },
  preRequestEditorType: "visual",
  testEditorType: "visual",
  preRequestRules: [],
  testRules: [],
};

interface PlaygroundState {
  request: ApiRequest;
  response: ApiResponse | null;
  isLoading: boolean;
  environments: Environment[];
  activeEnvironmentId: string | null;
  responseLayout: ResponseLayout;

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setRequest: (request: Partial<ApiRequest>) => void;
  setResponse: (response: ApiResponse | null) => void;
  setLoading: (loading: boolean) => void;
  resetRequest: () => void;

  addEnvironment: (name: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  updateEnvironmentVariable: (envId: string, key: string, value: string) => void;
  deleteEnvironmentVariable: (envId: string, key: string) => void;
  deleteEnvironment: (id: string) => void;
  setResponseLayout: (layout: ResponseLayout) => void;

  getActiveEnvironmentVariables: () => Record<string, string>;
}

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    immer<PlaygroundState>((set, get) => ({
      request: DEFAULT_REQUEST,
      response: null as ApiResponse | null,
      isLoading: false,
      responseLayout: "horizontal",
      environments: [
        {
          id: "default",
          name: "Default",
          variables: [] as KeyValuePair[],
        },
      ],
      activeEnvironmentId: "default",

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

      setResponse: (response) =>
        set((state) => {
          state.response = response;
        }),

      setLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),

      resetRequest: () =>
        set((state) => {
          state.request = DEFAULT_REQUEST;
          state.response = null;
        }),

      setResponseLayout: (responseLayout) =>
        set((state) => {
          state.responseLayout = responseLayout;
        }),

      addEnvironment: (name) =>
        set((state) => {
          state.environments.push({
            id: crypto.randomUUID(),
            name,
            variables: [],
          });
        }),

      setActiveEnvironment: (id) =>
        set((state) => {
          state.activeEnvironmentId = id;
        }),

      updateEnvironmentVariable: (envId, key, value) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          if (!env) return;

          const v = env.variables.find((v) => v.key === key);
          if (v) {
            v.value = value;
          } else {
            env.variables.push({ key, value, enabled: true });
          }
        }),

      deleteEnvironmentVariable: (envId, key) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          if (env) {
            env.variables = env.variables.filter((v) => v.key !== key);
          }
        }),
      deleteEnvironment: (id) =>
        set((state) => {
          if (id === "default") return; // Cannot delete default
          state.environments = state.environments.filter((e) => e.id !== id);
          if (state.activeEnvironmentId === id) {
            state.activeEnvironmentId = "default";
          }
        }),

      getActiveEnvironmentVariables: () => {
        const { environments, activeEnvironmentId } = get();
        const env = environments.find((e) => e.id === activeEnvironmentId);
        if (!env) return {};
        return Object.fromEntries(
          env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value])
        );
      },
    })),
    {
      name: STORAGE_KEY,
      partialize: (s) => {
        const req = s.request;
        const formDataFields = req.formDataFields?.map((f) => ({
          ...f,
          file: undefined,
        }));
        const sanitizedReq = sanitizeRequestForPersistence({ ...req, formDataFields });
        return {
          request: sanitizedReq,
          environments: sanitizeEnvironmentsForPersistence(s.environments),
          activeEnvironmentId: s.activeEnvironmentId,
          responseLayout: s.responseLayout,
        };
      },
    }
  )
);
