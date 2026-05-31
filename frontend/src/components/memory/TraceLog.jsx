import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Search, CheckCircle2, AlertCircle,
  Zap, Wrench, Activity
} from "lucide-react";

const eventIcons = {
  ping: Radio,
  scan_start: Search,
  scan_complete: CheckCircle2,
  analysis_start: Zap,
  analysis_complete: CheckCircle2,
  service_found: Activity,
  error: AlertCircle,
  tool_call: Wrench
};

const eventColors = {
  ping: "text-muted-foreground/60",
  scan_start: "text-primary",
  scan_complete: "text-chart-3",
  analysis_start: "text-accent",
  analysis_complete: "text-chart-3",
  service_found: "text-chart-4",
  error: "text-destructive",
  tool_call: "text-primary"
};

export default function TraceLog({ events = [] }) {
  return (
    <div className="flex h-full min-h-0 flex-col space-y-2 rounded-xl border border-border/40 bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Trace Log
        </h3>
        <div className="flex-1" />
        <div className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-0.5">
          <AnimatePresence>
            {events.map((event, i) => {
              const Icon = eventIcons[event.event_type] || Radio;
              return (
                <motion.div
                  key={event.id || i}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded px-2 py-1 text-[11px] hover:bg-muted/30"
                >
                  <Icon className={`mt-0.5 h-3 w-3 flex-shrink-0 ${eventColors[event.event_type] || ""}`} />
                  <span className="flex-1 leading-tight text-muted-foreground">
                    {event.message}
                  </span>
                  {event.created_date && (
                    <span className="flex-shrink-0 font-mono text-[9px] text-muted-foreground/40">
                      {format(new Date(event.created_date), "HH:mm:ss")}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {events.length === 0 && (
            <p className="py-4 text-center text-[11px] italic text-muted-foreground/40">
              Waiting for trace events...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}