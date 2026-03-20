"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generateCodeAction } from "@/app/actions/code-generator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { generateCurl } from "@/lib/utils/code-generator/curl";
import type { CodeGenerationOptions } from "@/types";

const LANGUAGES: { value: CodeGenerationOptions["language"]; label: string }[] = [
  { value: "ansible", label: "Ansible" },
  { value: "c", label: "C" },
  { value: "cfml", label: "CFML" },
  { value: "clojure", label: "Clojure" },
  { value: "csharp", label: "C#" },
  { value: "curl", label: "cURL" },
  { value: "dart", label: "Dart" },
  { value: "elixir", label: "Elixir" },
  { value: "go", label: "Go" },
  { value: "har", label: "HAR" },
  { value: "http", label: "HTTP" },
  { value: "httpie", label: "HTTPie" },
  { value: "java", label: "Java" },
  { value: "java-httpurlconnection", label: "Java (HttpURLConnection)" },
  { value: "java-jsoup", label: "Java (Jsoup)" },
  { value: "java-okhttp", label: "Java (OkHttp)" },
  { value: "javascript", label: "JavaScript (fetch)" },
  { value: "javascript-jquery", label: "JavaScript (jQuery)" },
  { value: "javascript-xhr", label: "JavaScript (XHR)" },
  { value: "json", label: "JSON" },
  { value: "julia", label: "Julia" },
  { value: "kotlin", label: "Kotlin" },
  { value: "lua", label: "Lua" },
  { value: "matlab", label: "MATLAB" },
  { value: "node", label: "Node.js (fetch)" },
  { value: "node-axios", label: "Node.js (axios)" },
  { value: "node-got", label: "Node.js (got)" },
  { value: "node-http", label: "Node.js (http)" },
  { value: "node-ky", label: "Node.js (ky)" },
  { value: "node-request", label: "Node.js (request)" },
  { value: "node-superagent", label: "Node.js (superagent)" },
  { value: "objc", label: "Objective-C" },
  { value: "ocaml", label: "OCaml" },
  { value: "perl", label: "Perl" },
  { value: "php", label: "PHP" },
  { value: "php-guzzle", label: "PHP (Guzzle)" },
  { value: "php-requests", label: "PHP (requests)" },
  { value: "powershell", label: "PowerShell (RestMethod)" },
  { value: "powershell-webrequest", label: "PowerShell (WebRequest)" },
  { value: "python", label: "Python (requests)" },
  { value: "python-http", label: "Python (http.client)" },
  { value: "r", label: "R (httr)" },
  { value: "r-httr2", label: "R (httr2)" },
  { value: "ruby", label: "Ruby" },
  { value: "ruby-httparty", label: "Ruby (httparty)" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "wget", label: "Wget" },
];

export function CodeGenerator() {
  const { request } = usePlaygroundStore();
  const [language, setLanguage] = useState<CodeGenerationOptions["language"]>("curl");
  const [code, setCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // For cURL, we can still generate it locally since it doesn't need curlconverter
    if (language === "curl") {
      setCode(generateCurl(request));
      return;
    }

    const updateCode = async () => {
      setIsLoading(true);
      try {
        const result = await generateCodeAction(request, { language });
        setCode(result);
      } catch (error) {
        console.error("Failed to generate code via server action:", error);
        setCode(
          `// Error generating code: ${error instanceof Error ? error.message : "Internal error"}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(updateCode, 300); // Debounce
    return () => clearTimeout(timer);
  }, [request, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <DialogTrigger className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors">
          Code
        </DialogTrigger>
      </motion.div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Code</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as CodeGenerationOptions["language"])}
          >
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="relative min-h-[12rem] rounded-md bg-muted p-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-[10px] uppercase tracking-wider font-medium">Generating...</p>
                </div>
              </motion.div>
            ) : (
              <motion.pre
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="m-0 overflow-auto text-xs font-mono leading-relaxed"
              >
                {code}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
