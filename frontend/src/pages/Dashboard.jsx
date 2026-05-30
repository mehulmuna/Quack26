import { useEffect, useState } from 'react';
import { getDashboardData } from '../services/api';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import ServiceCard from '../components/ServiceCard';
import ExperimentPanel from '../components/ExperimentPanel';
import ActivityFeed from '../components/ActivityFeed';
import Infrastructure from '../components/Infrastructure';
import ActiveEffects from '../components/ActiveEffects';
import Issues from '../components/Issues';

function riskTone(risk) {
  if (risk >= 70) return 'from-rose-500 to-orange-400';
  if (risk >= 40) return 'from-amber-400 to-yellow-300';
  return 'from-emerald-400 to-cyan-300';
}

function statusTone(status) {
  if (status === 'Running' || status === 'Healthy') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (status === 'Degraded') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let active = true;

    getDashboardData().then((data) => {
      if (active) setDashboard(data);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-slate-200">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          Loading dashboard...
        </div>
      </main>
    );
  }

  const kpis = [
    { label: 'Experiments', value: dashboard.kpis.experimentsRun, accent: 'from-cyan-500 to-blue-600' },
    { label: 'Services', value: dashboard.kpis.servicesMonitored, accent: 'from-emerald-500 to-teal-600' },
    { label: 'Issues', value: dashboard.kpis.issuesFound, accent: 'from-rose-500 to-pink-600' },
    { label: 'Reports', value: dashboard.kpis.reportsGenerated, accent: 'from-amber-400 to-orange-500' },
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Header dashboard={dashboard} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item, index) => (
            <StatCard key={item.label} label={item.label} value={item.value} accent={item.accent} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Service Risk Analysis</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Services being monitored</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {dashboard.services.length} services
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {dashboard.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          </div>

          <div>
            <ExperimentPanel experiment={dashboard.activeExperiment} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Infrastructure infrastructure={dashboard.infrastructure} />
          <ActiveEffects effects={dashboard.activeEffects} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Issues issues={dashboard.issues} />

          <ActivityFeed events={dashboard.activityFeed} />
        </section>

        {/* <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tools Being Used</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tool usage</h2>

            <div className="mt-5 space-y-3">
              {dashboard.tools.map((tool) => (
                <div key={tool.name} className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                  <p className="font-medium text-cyan-50">{tool.name}</p>
                  <span className="rounded-full border border-cyan-200/20 bg-slate-950/30 px-3 py-1 text-xs text-cyan-100">
                    {tool.usageCount} uses
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Generated Reports</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Reports generated by the system</h2>

            <div className="mt-5 space-y-3">
              {dashboard.reports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{report.id}</p>
                  <h3 className="mt-2 text-sm font-medium text-white">{report.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{report.summary}</p>
                  <p className="mt-3 text-xs text-cyan-100">Recommendation: {report.recommendation}</p>
                </article>
              ))}
            </div>
          </div>
        </section> */}
      </div>
    </main>
  );
}
