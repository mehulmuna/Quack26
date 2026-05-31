import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { getDashboardData, getIsRunning, getReport, startScan, stopScan } from "@/services/api";
import OrbVisual from "@/components/workspace/OrbVisual";
import RunControls from "@/components/workspace/RunControls";
import ProjectInputs from "@/components/workspace/ProjectInputs";
import StatsBar from "@/components/workspace/StatsBar";
import ServicesList from "@/components/workspace/ServicesList";
import ReportList from "@/components/sidebar/ReportList";
import ReportViewer from "@/components/sidebar/ReportViewer";
import TraceLog from "@/components/memory/TraceLog";
import AnalysisReports from "@/components/memory/AnalysisReports";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Brain, Scan } from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const hydratedConfigRef = useRef(false);
  const reportRequestRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [config, setConfig] = useState({
    name: "",
    directory: "",
    commands: [{ label: "dev", command: "npm run dev" }]
  });

  const { data: dashboard = {} } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    refetchInterval: 10000
  });

  const { data: runningState } = useQuery({
    queryKey: ["isRunning"],
    queryFn: getIsRunning,
    refetchInterval: 1000
  });

  const services = dashboard.services || [];
  const reports = dashboard.reports || [];
  const traceEvents = dashboard.traceEvents || [];
  const stats = dashboard.stats || { toolsCalled: 0, tokensUsed: 0, duration: 0 };

  useEffect(() => {
    if (hydratedConfigRef.current || !dashboard.config) return;

    if (dashboard.config.name || dashboard.config.directory) {
      setConfig((current) => ({
        ...current,
        ...dashboard.config,
        commands: dashboard.config.commands?.length
          ? dashboard.config.commands
          : current.commands,
      }));
    }

    hydratedConfigRef.current = true;
  }, [dashboard.config]);

  useEffect(() => {
    if (typeof runningState?.running === "boolean" && runningState.running !== isRunning) {
      setIsRunning(runningState.running);
    }
  }, [isRunning, runningState]);

  const refreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  const handleRun = useCallback(async () => {
    setCurrentService(null);
    setIsRunning(true);
    await startScan(config);
    await refreshDashboard();
  }, [config, refreshDashboard]);

  const handleStop = useCallback(async () => {
    setCurrentService(null);
    setIsRunning(false);
    await stopScan();
    await refreshDashboard();
  }, [refreshDashboard]);

  const handleSelectReport = useCallback(async (report) => {
    const requestId = reportRequestRef.current + 1;
    reportRequestRef.current = requestId;
    setSelectedReport(report);

    if (report.content) return;

    try {
      const fullReport = await getReport(report.id);
      if (reportRequestRef.current !== requestId) return;

      setSelectedReport(fullReport);
    } catch (error) {
      if (reportRequestRef.current !== requestId) return;

      setSelectedReport({
        ...report,
        content: `# Unable to load report content\n\n${error.message}`,
      });
    }
  }, []);

  const handleReportDialogOpenChange = useCallback((open) => {
    if (open) return;

    reportRequestRef.current += 1;
    setSelectedReport(null);
  }, []);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <div className="w-72 border-r border-border/50 bg-card/50 flex flex-col flex-shrink-0">
        <ReportList
          reports={reports}
          selectedId={selectedReport?.id}
          onSelect={handleSelectReport}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scan className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Service Scanner</h1>
              <p className="text-xs text-muted-foreground">Discover & analyze your architecture</p>
            </div>
          </div>

          <RunControls isRunning={isRunning} onRun={handleRun} onStop={handleStop} />

          <OrbVisual isRunning={isRunning} servicesCount={services.length} />

          <Separator className="bg-border/30" />

          <ProjectInputs config={config} onChange={setConfig} />

          <Separator className="bg-border/30" />

          <StatsBar
            toolsCalled={stats.toolsCalled}
            tokensUsed={stats.tokensUsed}
            duration={stats.duration}
          />

          <Separator className="bg-border/30" />

          <ServicesList services={services} currentService={currentService} />
        </div>
      </div>

      <div className="w-[30vw] border-l border-border/50 bg-card/50 flex-shrink-0 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold tracking-wide">Memory</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <TraceLog events={traceEvents} />
          <Separator className="bg-border/30" />
          <AnalysisReports reports={reports} onSelect={handleSelectReport} />
        </div>
      </div>

      <Dialog open={!!selectedReport} onOpenChange={handleReportDialogOpenChange}>
        <DialogContent className="h-[85vh] max-h-[900px] min-h-0 w-[calc(100vw-2rem)] max-w-5xl gap-0 overflow-hidden p-0">
          <ReportViewer report={selectedReport} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
