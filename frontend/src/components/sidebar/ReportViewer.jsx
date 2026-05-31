import ReactMarkdown from "react-markdown";
import { Clock, Wrench, Coins, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const markdownComponents = {
  h1: ({ ...props }) => (
    <h1 className="mb-4 mt-1 border-b border-border/60 pb-3 text-2xl font-semibold tracking-tight text-foreground" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="mb-3 mt-8 border-b border-border/40 pb-2 text-xl font-semibold tracking-tight text-foreground" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="mb-2 mt-6 text-base font-semibold text-foreground" {...props} />
  ),
  h4: ({ ...props }) => (
    <h4 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground" {...props} />
  ),
  p: ({ ...props }) => (
    <p className="mb-4 leading-7 text-secondary-foreground" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="mb-4 ml-5 list-disc space-y-2 text-secondary-foreground marker:text-primary" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="mb-4 ml-5 list-decimal space-y-2 text-secondary-foreground marker:text-primary" {...props} />
  ),
  li: ({ ...props }) => (
    <li className="pl-1 leading-7" {...props} />
  ),
  a: ({ ...props }) => (
    <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noreferrer" {...props} />
  ),
  blockquote: ({ ...props }) => (
    <blockquote className="mb-4 border-l-2 border-primary/70 bg-muted/30 px-4 py-3 text-secondary-foreground" {...props} />
  ),
  hr: ({ ...props }) => (
    <hr className="my-6 border-border/60" {...props} />
  ),
  strong: ({ ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary" {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className={`font-mono text-xs leading-6 text-secondary-foreground ${className || ""}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ ...props }) => (
    <pre className="mb-5 overflow-x-auto rounded-md border border-border/70 bg-background/80 p-4" {...props} />
  ),
  table: ({ ...props }) => (
    <div className="mb-5 overflow-x-auto rounded-md border border-border/70">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ ...props }) => (
    <th className="border-b border-border/70 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="border-b border-border/40 px-3 py-2 text-secondary-foreground" {...props} />
  ),
};

export default function ReportViewer({ report, onSuggestedFix }) {
  if (!report) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="border-b border-border/50 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{report.title}</h2>
            <div className="mt-2 flex flex-wrap gap-4">
              {report.tools_called > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wrench className="h-3.5 w-3.5" /> {report.tools_called} tools
                </span>
              )}
              {report.tokens_used > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" /> {report.tokens_used} tokens
                </span>
              )}
              {report.duration_seconds > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {report.duration_seconds}s
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            onClick={onSuggestedFix}
            className="shrink-0 gap-2 rounded-full bg-primary px-8 py-2.5 font-medium tracking-wide text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <WandSparkles className="h-4 w-4" />
            Fix
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 py-5 text-sm">
          <ReactMarkdown components={markdownComponents}>
            {report.content || "*Report content is being generated...*"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
