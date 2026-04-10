import type { ApiRequest } from "@/types";
import {
  compilePostRequestRules,
  compilePreRequestRules,
  compileTestRules,
} from "@/utils/rule-compiler";

export function prepareExecutionScripts(request: ApiRequest) {
  const preRequestScript =
    request.preRequestEditorType === "visual"
      ? compilePreRequestRules(request.preRequestRules)
      : request.preRequestScript;
  const postRequestScript =
    request.postRequestEditorType === "visual"
      ? compilePostRequestRules(request.postRequestRules)
      : request.postRequestScript;
  const testScript =
    request.testEditorType === "visual" ? compileTestRules(request.testRules) : request.testScript;

  return { postRequestScript, preRequestScript, testScript };
}
