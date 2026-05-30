import { useEffect, useState } from 'react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import ServiceCard from '../components/ServiceCard';
import ExperimentPanel from '../components/ExperimentPanel';
import ActivityFeed from '../components/ActivityFeed';
import { getDashboardData } from '../services/api';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let active = true;

    getDashboardData().then((data) => {
      if (active) {
        setDashboard(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-slate-200">
        <div className="rounded-3xl border border-white/10 bg-white/6 px-6 py-5 backdrop-blur-xl">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Header />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Service Risk Scores</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Systems under observation</h2>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          </div>

          <ExperimentPanel experiment={dashboard.currentExperiment} />
        </section>

        <ActivityFeed events={dashboard.events} />
      </div>
    </main>
  );
}
