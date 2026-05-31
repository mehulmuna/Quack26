import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AnalysisReports({ reports = [], onSelect }) {
  const analysisReports = reports.filter(r => r.report_type === "analysis");

  return (
    <div className="flex h-full min-h-0 flex-col space-y-2 rounded-xl border border-border/40 bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Analysis Reports
        </h3>
        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">
          {analysisReports.length}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {analysisReports.map((report) => (
            <button
              key={report.id}
              onClick={() => onSelect(report)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
            >
              {report.status === "generating" ? (
                <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-chart-3" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{report.title}</p>
                {report.service_name && (
                  <p className="font-mono text-[9px] text-muted-foreground/60">
                    {report.service_name}
                  </p>
                )}
              </div>
              {report.created_date && (
                <span className="font-mono text-[9px] text-muted-foreground/40">
                  {format(new Date(report.created_date), "HH:mm")}
                </span>
              )}
            </button>
          ))}

          {analysisReports.length === 0 && (
            <p className="py-4 text-center text-[11px] italic text-muted-foreground/40">
              No analysis reports yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}