import type { PipelineStep } from "@/types";

export function resolveStepAuth(
  step: PipelineStep,
  resolve: (value: string) => string,
): PipelineStep["auth"] {
  if (step.auth.type === "bearer" && step.auth.bearer) {
    return { ...step.auth, bearer: { token: resolve(step.auth.bearer.token ?? "") } };
  }
  if (step.auth.type === "basic" && step.auth.basic) {
    return {
      ...step.auth,
      basic: {
        username: resolve(step.auth.basic.username ?? ""),
        password: resolve(step.auth.basic.password ?? ""),
      },
    };
  }
  if (step.auth.type === "api-key" && step.auth.apiKey) {
    return {
      ...step.auth,
      apiKey: {
        ...step.auth.apiKey,
        key: resolve(step.auth.apiKey.key ?? ""),
        value: resolve(step.auth.apiKey.value ?? ""),
      },
    };
  }
  if (step.auth.type === "oauth2" && step.auth.oauth2) {
    return { ...step.auth, oauth2: { accessToken: resolve(step.auth.oauth2.accessToken ?? "") } };
  }
  if (step.auth.type === "aws-sigv4" && step.auth.awsSigv4) {
    return {
      ...step.auth,
      awsSigv4: {
        accessKey: resolve(step.auth.awsSigv4.accessKey ?? ""),
        secretKey: resolve(step.auth.awsSigv4.secretKey ?? ""),
        region: resolve(step.auth.awsSigv4.region ?? ""),
        service: resolve(step.auth.awsSigv4.service ?? ""),
      },
    };
  }
  return step.auth;
}
