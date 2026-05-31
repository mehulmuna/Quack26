import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { scanProjectServices, analyzeService } from "@/lib/scanService";
import OrbVisual from "@/components/workspace/OrbVisual";
import RunControls from "@/components/workspace/RunControls";
import ProjectInputs from "@/components/workspace/ProjectInputs";
import StatsBar from "@/components/workspace/StatsBar";
import ServicesList from "@/components/workspace/ServicesList";
import ReportList from "@/components/sidebar/ReportList";
import ReportViewer from "@/components/sidebar/ReportViewer";
import TraceLog from "@/components/memory/TraceLog";
import AnalysisReports from "@/components/memory/AnalysisReports";
import { Brain, Scan } from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [stats, setStats] = useState({ toolsCalled: 0, tokensUsed: 0, duration: 0 });
  const [config, setConfig] = useState({
    name: "",
    directory: "",
    commands: [{ label: "dev", command: "npm run dev" }]
  });
  const stopRef = useRef(false);
  const timerRef = useRef(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services", config.name],
    queryFn: () => config.name
      ? base44.entities.Service.filter({ project_name: config.name }, "-created_date", 50)
      : [],
    enabled: !!config.name,
    refetchInterval: isRunning ? 2000 : false
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", config.name],
    queryFn: () => config.name
      ? base44.entities.Report.filter({ project_name: config.name }, "-created_date", 50)
      : [],
    enabled: !!config.name,
    refetchInterval: isRunning ? 3000 : 10000
  });

  const { data: traceEvents = [] } = useQuery({
    queryKey: ["traces", config.name],
    queryFn: () => config.name
      ? base44.entities.TraceEvent.filter({ project_name: config.name }, "-created_date", 100)
      : [],
    enabled: !!config.name,
    refetchInterval: isRunning ? 2000 : false
  });

  // Duration timer
  useEffect(() => {
    if (isRunning) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setStats(prev => ({ ...prev, duration: Math.round((Date.now() - startTime) / 1000) }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Ping trace every 5s
  useEffect(() => {
    if (!isRunning || !config.name) return;
    const interval = setInterval(() => {
      base44.entities.TraceEvent.create({
        project_name: config.name,
        event_type: "ping",
        message: "Agent heartbeat — system active"
      }).then(() => queryClient.invalidateQueries({ queryKey: ["traces"] }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isRunning, config.name, queryClient]);

  const handleRun = useCallback(async () => {
    if (!config.name) return;
    stopRef.current = false;
    setIsRunning(true);
    setStats({ toolsCalled: 0, tokensUsed: 0, duration: 0 });

    // Phase 1: Scan services
    const foundServices = await scanProjectServices(config.name, config.directory);
    queryClient.invalidateQueries({ queryKey: ["services"] });
    queryClient.invalidateQueries({ queryKey: ["traces"] });

    if (stopRef.current) { setIsRunning(false); return; }

    // Phase 2: Analyze each service
    let totalTools = 0;
    let totalTokens = 0;

    for (const service of foundServices) {
      if (stopRef.current) break;

      setCurrentService(service.name);
      const result = await analyzeService(service, config.name);
      totalTools += result.toolsCalled;
      totalTokens += result.tokensUsed;
      setStats(prev => ({ ...prev, toolsCalled: totalTools, tokensUsed: totalTokens }));

      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["traces"] });
    }

    // Summary report
    if (!stopRef.current) {
      await base44.entities.Report.create({
        title: `Summary: ${config.name}`,
        project_name: config.name,
        report_type: "summary",
        status: "complete",
        content: `# Scan Summary\n\n**Project:** ${config.name}\n**Services Found:** ${foundServices.length}\n**Total Tools Called:** ${totalTools}\n**Total Tokens Used:** ${totalTokens}\n\n## Services\n\n${foundServices.map(s => `- **${s.name}** (${s.type}) — ${s.language}`).join('\n')}`,
        tokens_used: totalTokens,
        tools_called: totalTools
      });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    }

    setCurrentService(null);
    setIsRunning(false);
  }, [config, queryClient]);

  const handleStop = () => {
    stopRef.current = true;
    setIsRunning(false);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left: Report Viewer */}
      <div className="w-64 border-r border-border/50 bg-card/50 flex flex-col flex-shrink-0">
        {selectedReport ? (
          <ReportViewer report={selectedReport} onBack={() => setSelectedReport(null)} />
        ) : (
          <ReportList
            reports={reports}
            selectedId={selectedReport?.id}
            onSelect={setSelectedReport}
          />
        )}
      </div>

      {/* Center: Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scan className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Service Scanner</h1>
              <p className="text-xs text-muted-foreground">Discover & analyze your architecture</p>
            </div>
          </div>

          {/* Run Controls */}
          <RunControls isRunning={isRunning} onRun={handleRun} onStop={handleStop} />

          {/* Orb Visual */}
          <OrbVisual isRunning={isRunning} servicesCount={services.length} />

          <Separator className="bg-border/30" />

          {/* Inputs */}
          <ProjectInputs config={config} onChange={setConfig} />

          <Separator className="bg-border/30" />

          {/* Stats */}
          <StatsBar
            toolsCalled={stats.toolsCalled}
            tokensUsed={stats.tokensUsed}
            duration={stats.duration}
          />

          <Separator className="bg-border/30" />

          {/* Services */}
          <ServicesList services={services} currentService={currentService} />
        </div>
      </div>

      {/* Right: Memory Manager */}
      <div className="w-72 border-l border-border/50 bg-card/50 flex-shrink-0 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold tracking-wide">Memory</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <TraceLog events={traceEvents} />
          <Separator className="bg-border/30" />
          <AnalysisReports reports={reports} onSelect={setSelectedReport} />
        </div>
      </div>
    </div>
  );
}