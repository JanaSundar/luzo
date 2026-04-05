import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactElement } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <MotionConfig reducedMotion="always">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };

export function createMockRequest(overrides = {}) {
  return {
    method: "GET" as const,
    url: "https://api.example.com/users",
    headers: {},
    params: {},
    body: null,
    auth: { type: "none" as const },
    ...overrides,
  };
}
