"use client";

import { Code2, Copy, Check, Loader2 } from "lucide-react";
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
  DialogDescription,
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
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <DialogTrigger className="inline-flex h-8.5 items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted hover:text-foreground shadow-xs">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Code2 className="h-3.5 w-3.5" />
          )}
          Code
        </DialogTrigger>
      </motion.div>
      <DialogContent className="flex h-[min(88dvh,550px)] flex-col overflow-hidden sm:max-w-3xl border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground border border-border">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Generate Code</DialogTitle>
              <DialogDescription className="text-sm text-balance">
                Convert your request into production-ready code snippets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex shrink-0 items-center px-6 mb-4">
          <div className="flex items-center gap-3 w-full p-2 rounded-lg bg-muted/50 border border-border">
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as CodeGenerationOptions["language"])}
            >
              <SelectTrigger className="w-52 h-9 rounded-md border-border bg-background hover:bg-accent transition-colors text-sm font-medium pl-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-lg border-border bg-popover shadow-lg">
                {LANGUAGES.map((l) => (
                  <SelectItem
                    key={l.value}
                    value={l.value}
                    className="rounded-md py-2 text-sm focus:bg-accent focus:text-accent-foreground"
                  >
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 gap-2 rounded-md border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 shadow-xs"
                onClick={copy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  {copied ? "Copied" : "Copy"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="relative h-full group overflow-hidden rounded-lg border border-border bg-zinc-50 dark:bg-zinc-950 shadow-inner">
            <div className="h-full overflow-auto p-5 custom-scrollbar font-mono text-[13px] leading-relaxed">
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-xs z-10"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">
                        Generating...
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.pre
                    key="code"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="m-0 text-zinc-700 dark:text-zinc-300 selection:bg-primary/30"
                  >
                    {code}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
