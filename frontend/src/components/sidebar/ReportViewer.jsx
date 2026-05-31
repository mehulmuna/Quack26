import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Wrench, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportViewer({ report, onBack }) {
  if (!report) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mb-2 -ml-2"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back
        </Button>
        <h3 className="text-sm font-semibold truncate">{report.title}</h3>
        <div className="flex gap-3 mt-2">
          {report.tools_called > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Wrench className="w-2.5 h-2.5" /> {report.tools_called}
            </span>
          )}
          {report.tokens_used > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Coins className="w-2.5 h-2.5" /> {report.tokens_used}
            </span>
          )}
          {report.duration_seconds > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {report.duration_seconds}s
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed
          prose-headings:text-foreground prose-headings:font-semibold
          prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50
          prose-strong:text-foreground
          prose-ul:text-muted-foreground prose-ol:text-muted-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown>{report.content || "*Report content is being generated...*"}</ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}