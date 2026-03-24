import * as curlconverter from "curlconverter";
import type { ApiRequest, CodeGenerationOptions } from "@/types";
import { generateCurl } from "./curl";

export function generateCode(request: ApiRequest, options: CodeGenerationOptions): string {
  const curlCommand = generateCurl(request);

  const generators: Record<CodeGenerationOptions["language"], (cmd: string) => string> = {
    curl: (cmd) => cmd,
    ansible: (cmd) => curlconverter.toAnsible(cmd),
    c: (cmd) => curlconverter.toC(cmd),
    cfml: (cmd) => curlconverter.toCFML(cmd),
    clojure: (cmd) => curlconverter.toClojure(cmd),
    csharp: (cmd) => curlconverter.toCSharp(cmd),
    dart: (cmd) => curlconverter.toDart(cmd),
    elixir: (cmd) => curlconverter.toElixir(cmd),
    go: (cmd) => curlconverter.toGo(cmd),
    har: (cmd) => curlconverter.toHarString(cmd),
    http: (cmd) => curlconverter.toHTTP(cmd),
    httpie: (cmd) => curlconverter.toHttpie(cmd),
    java: (cmd) => curlconverter.toJava(cmd),
    "java-httpurlconnection": (cmd) => curlconverter.toJavaHttpUrlConnection(cmd),
    "java-jsoup": (cmd) => curlconverter.toJavaJsoup(cmd),
    "java-okhttp": (cmd) => curlconverter.toJavaOkHttp(cmd),
    javascript: (cmd) => curlconverter.toJavaScript(cmd),
    "javascript-jquery": (cmd) => curlconverter.toJavaScriptJquery(cmd),
    "javascript-xhr": (cmd) => curlconverter.toJavaScriptXHR(cmd),
    typescript: (cmd) => curlconverter.toJavaScript(cmd), // Fallback to JS for TS
    json: (cmd) => curlconverter.toJsonString(cmd),
    julia: (cmd) => curlconverter.toJulia(cmd),
    kotlin: (cmd) => curlconverter.toKotlin(cmd),
    lua: (cmd) => curlconverter.toLua(cmd),
    matlab: (cmd) => curlconverter.toMATLAB(cmd),
    node: (cmd) => curlconverter.toNode(cmd),
    "node-http": (cmd) => curlconverter.toNodeHttp(cmd),
    "node-axios": (cmd) => curlconverter.toNodeAxios(cmd),
    "node-got": (cmd) => curlconverter.toNodeGot(cmd),
    "node-ky": (cmd) => curlconverter.toNodeKy(cmd),
    "node-request": (cmd) => curlconverter.toNodeRequest(cmd),
    "node-superagent": (cmd) => curlconverter.toNodeSuperAgent(cmd),
    objc: (cmd) => curlconverter.toObjectiveC(cmd),
    ocaml: (cmd) => curlconverter.toOCaml(cmd),
    perl: (cmd) => curlconverter.toPerl(cmd),
    php: (cmd) => curlconverter.toPhp(cmd),
    "php-guzzle": (cmd) => curlconverter.toPhpGuzzle(cmd),
    "php-requests": (cmd) => curlconverter.toPhpRequests(cmd),
    powershell: (cmd) => curlconverter.toPowershellRestMethod(cmd),
    "powershell-webrequest": (cmd) => curlconverter.toPowershellWebRequest(cmd),
    python: (cmd) => curlconverter.toPython(cmd),
    "python-http": (cmd) => curlconverter.toPythonHttp(cmd),
    r: (cmd) => curlconverter.toR(cmd),
    "r-httr2": (cmd) => curlconverter.toRHttr2(cmd),
    ruby: (cmd) => curlconverter.toRuby(cmd),
    "ruby-httparty": (cmd) => curlconverter.toRubyHttparty(cmd),
    rust: (cmd) => curlconverter.toRust(cmd),
    swift: (cmd) => curlconverter.toSwift(cmd),
    wget: (cmd) => curlconverter.toWget(cmd),
  };

  try {
    const generator = generators[options.language];
    return generator ? generator(curlCommand) : curlCommand;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `// Error generating code: ${message}\n${curlCommand}`;
  }
}
