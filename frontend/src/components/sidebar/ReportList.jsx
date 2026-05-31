import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const typeColors = {
  analysis: "text-primary",
  scan: "text-chart-3",
  trace: "text-accent",
  error: "text-destructive",
  summary: "text-chart-4"
};

const statusIcons = {
  generating: Loader2,
  complete: CheckCircle2,
  error: AlertCircle
};

export default function ReportList({ reports = [], selectedId, onSelect }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide">Reports</h2>
          <Badge variant="secondary" className="ml-auto text-[10px] h-5">
            {reports.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {reports.map((report) => {
            const StatusIcon = statusIcons[report.status] || FileText;
            const isSelected = selectedId === report.id;

            return (
              <motion.button
                key={report.id}
                onClick={() => onSelect(report)}
                whileHover={{ x: 2 }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <StatusIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                    report.status === "generating" ? "animate-spin text-primary" :
                    typeColors[report.report_type] || "text-muted-foreground"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {report.report_type}
                      </span>
                      {report.created_date && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {format(new Date(report.created_date), "HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}

          {reports.length === 0 && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No reports yet</p>
              <p className="text-[10px] mt-1 opacity-60">Run a scan to generate reports</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}