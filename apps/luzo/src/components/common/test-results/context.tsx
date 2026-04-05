import { createContext } from "react";

export type TestStatus = "passed" | "failed" | "skipped" | "running";

export interface TestResultsSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
}

export interface TestResultsContextType {
  summary?: TestResultsSummary;
}

export const TestResultsContext = createContext<TestResultsContextType>({});

export interface TestSuiteContextType {
  name: string;
  status: TestStatus;
}

export const TestSuiteContext = createContext<TestSuiteContextType>({
  name: "",
  status: "passed",
});

export interface TestContextType {
  name: string;
  status: TestStatus;
  duration?: number;
}

export const TestContext = createContext<TestContextType>({
  name: "",
  status: "passed",
});

export const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};
