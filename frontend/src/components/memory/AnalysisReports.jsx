import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AnalysisReports({ reports = [], onSelect }) {
  const analysisReports = reports.filter(r => r.report_type === "analysis");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Analysis Reports
        </h3>
        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">
          {analysisReports.length}
        </Badge>
      </div>

      <ScrollArea className="h-40">
        <div className="space-y-1 pr-2">
          {analysisReports.map((report) => (
            <button
              key={report.id}
              onClick={() => onSelect(report)}
              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors"
            >
              {report.status === "generating" ? (
                <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-chart-3 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{report.title}</p>
                {report.service_name && (
                  <p className="text-[9px] text-muted-foreground/60 font-mono">
                    {report.service_name}
                  </p>
                )}
              </div>
              {report.created_date && (
                <span className="text-[9px] text-muted-foreground/40 font-mono">
                  {format(new Date(report.created_date), "HH:mm")}
                </span>
              )}
            </button>
          ))}

          {analysisReports.length === 0 && (
            <p className="text-[11px] text-muted-foreground/40 text-center py-4 italic">
              No analysis reports yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}