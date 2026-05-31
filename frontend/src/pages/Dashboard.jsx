import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardData, getIsRunning, getReport, startScan, stopScan } from "@/services/api";
import OrbVisual from "@/components/workspace/OrbVisual";
import ProjectInputs from "@/components/workspace/ProjectInputs";
import StatsBar from "@/components/workspace/StatsBar";
import TraceLog from "@/components/memory/TraceLog";
import AnalysisReports from "@/components/memory/AnalysisReports";
import BackendTerminal from "@/components/workspace/BackendTerminal";
import ReportViewer from "@/components/sidebar/ReportViewer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Brain, Scan } from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const hydratedConfigRef = useRef(false);
  const terminalBufferRef = useRef("");
  const reportRequestRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [terminalCount, setTerminalCount] = useState(0);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveTokensUsed, setLiveTokensUsed] = useState(0);
  const [liveToolsCalled, setLiveToolsCalled] = useState(0);
  const [config, setConfig] = useState({
    name: "",
    directory: "",
    commands: [{ label: "dev", command: "npm run dev" }]
  });

  const { data: dashboard = {} } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    // Keep stats responsive while scans are active.
    refetchInterval: isRunning ? 1000 : 10000
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
  const runStatus = dashboard.status || {};

  const parseNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const traceToolCount = traceEvents.filter((event) => event.event_type === "tool_call").length;
  const toolsCalledLive = Math.max(parseNumber(stats.toolsCalled), traceToolCount, liveToolsCalled);
  const tokensUsedLive = Math.max(parseNumber(stats.tokensUsed), liveTokensUsed);
  const durationLive = Math.max(parseNumber(stats.duration), liveDuration);

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

  useEffect(() => {
    if (!isRunning) return;

    const startedAtMs = runStatus?.startedAt ? Date.parse(runStatus.startedAt) : NaN;
    if (!Number.isFinite(startedAtMs)) return;

    const tick = () => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setLiveDuration(elapsedSec);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, runStatus?.startedAt]);

  useEffect(() => {
    if (!isRunning) {
      setLiveToolsCalled(0);
      setLiveTokensUsed(0);
      return;
    }

    setLiveToolsCalled(traceToolCount);
  }, [isRunning, traceToolCount]);

  const refreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  const handleRun = useCallback(async () => {
    setCurrentService(null);
    setIsRunning(true);
    setTerminalCount(0);
    setLiveDuration(0);
    setLiveTokensUsed(0);
    setLiveToolsCalled(0);
    terminalBufferRef.current = "";
    await startScan(config);
    await refreshDashboard();
  }, [config, refreshDashboard]);

  const handleStop = useCallback(async () => {
    setCurrentService(null);
    setIsRunning(false);
    await stopScan();
    await refreshDashboard();
  }, [refreshDashboard]);

  const processTerminalLine = useCallback((line) => {
    if (/==Starting main loop==/i.test(line)) {
      setTerminalCount(0);
      return;
    }

    if (/\bLOOP TURN START\b/i.test(line)) {
      const turnMatch = line.match(/turn:\s*(\d+)/i);
      if (turnMatch) {
        setTerminalCount(Number(turnMatch[1]) || 0);
        return;
      }

      setTerminalCount((current) => current + 1);
      return;
    }

    if (/=== TURN RESULT ===/i.test(line)) {
      setTerminalCount((current) => Math.max(current, 1));
      return;
    }

    if (/=== FINAL ===/i.test(line)) {
      setTerminalCount((current) => Math.max(current, 1));
    }

    const tokenMatch = line.match(/(?:totalTokenCount|tokens[_\s-]*used)\D+(\d+)/i)
      || line.match(/\btokens?\b\D+(\d{2,})/i);

    if (tokenMatch) {
      const parsedTokens = Number(tokenMatch[1]);
      if (Number.isFinite(parsedTokens)) {
        setLiveTokensUsed((current) => Math.max(current, parsedTokens));
      }
    }

    const toolsMatch = line.match(/tools?[_\s-]*called\D+(\d+)/i);
    if (toolsMatch) {
      const parsedTools = Number(toolsMatch[1]);
      if (Number.isFinite(parsedTools)) {
        setLiveToolsCalled((current) => Math.max(current, parsedTools));
      }
    }
  }, []);

  const handleTerminalEvent = useCallback((event) => {
    if (event?.type !== "output" || typeof event.data !== "string") return;

    const cleaned = event.data
      .replace(/\u001b\[[0-9;]*m/g, "")
      .replace(/\r/g, "");

    const nextBuffer = `${terminalBufferRef.current}${cleaned}`;
    const lines = nextBuffer.split("\n");
    terminalBufferRef.current = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        processTerminalLine(line.trim());
      }
    }
  }, [processTerminalLine]);

  const handleSuggestedFix = useCallback(async () => {
    if (!selectedReport) return;

    const reportName = selectedReport.fileName || selectedReport.id || selectedReport.title;

    await fetch("http://localhost:3002/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ report: reportName }),
    });
  }, [selectedReport]);

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
    <div className="h-screen bg-background overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <main className="min-w-0 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col gap-4 p-6">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5 shadow-sm shrink-0">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scan className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold tracking-tight">PsychoPunch</h1>
                      <p className="text-xs text-muted-foreground">Discover & analyze your architecture</p>
                    </div>
                  </div>

                  <OrbVisual isRunning={isRunning} count={terminalCount} />
                  <div className="h-px bg-border/30" />
                  <StatsBar
                    toolsCalled={toolsCalledLive}
                    tokensUsed={tokensUsedLive}
                    duration={durationLive}
                  />
                  <div className="h-px bg-border/30" />
                </section>

                <section className="space-y-6 border-t border-border/30 pt-6 xl:border-t-0 xl:border-l xl:border-border/30 xl:pt-0 xl:pl-6">
                  <ProjectInputs
                    config={config}
                    onChange={setConfig}
                    isRunning={isRunning}
                    onRun={handleRun}
                    onStop={handleStop}
                  />
                </section>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <BackendTerminal onEvent={handleTerminalEvent} />
            </div>
          </div>
        </main>

        <aside className="min-w-0 border-t border-border/50 lg:border-t-0 lg:border-l lg:border-border/50 bg-card/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/50 flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold tracking-wide">Memory</h2>
          </div>

          <div className="grid flex-1 min-h-0 grid-rows-2 gap-3 p-3">
            <TraceLog events={traceEvents} />
            <AnalysisReports reports={reports} onSelect={handleSelectReport} />
          </div>
        </aside>
      </div>

      <Dialog open={!!selectedReport} onOpenChange={handleReportDialogOpenChange}>
        <DialogContent className="h-[85vh] max-h-[900px] min-h-0 w-[calc(100vw-2rem)] max-w-5xl gap-0 overflow-hidden p-0">
          <ReportViewer report={selectedReport} onSuggestedFix={handleSuggestedFix} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
