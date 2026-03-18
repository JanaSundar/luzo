"use client";

import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportExecutiveSummaryProps {
  reportOutput: string | null;
}

export function ReportExecutiveSummary({ reportOutput }: ReportExecutiveSummaryProps) {
  return (
    <section className="space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Executive Summary
      </h3>

      {reportOutput ? (
        <ReportMarkdown content={reportOutput} />
      ) : (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <Sparkles className="h-8 w-8 mx-auto opacity-20" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground/60">No narrative generated yet</p>
            <p className="text-xs">
              Configure your signals, then click "Generate Report" above to see insights.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ReportMarkdown({ content }: { content: string }) {
  return (
    <div className="report-markdown text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 mt-8 text-2xl font-bold tracking-tight text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-8 border-b border-border/50 pb-2 text-xl font-bold text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-base font-semibold text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-4 text-sm font-semibold text-foreground">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          code: ({ children, className }) =>
            className ? (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>
            ) : (
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>{children}</Table>
                </div>
              </CardContent>
            </Card>
          ),
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => (
            <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {children}
            </TableHead>
          ),
          td: ({ children }) => (
            <TableCell className="px-4 py-3 font-mono text-xs">{children}</TableCell>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-2 border-primary/30 bg-primary/5 py-2 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border/50" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
