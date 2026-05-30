import { mockDashboardData } from '../data/mockDashboard';

const DEFAULT_API_URL = 'http://localhost:3000';

async function fetchJson(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getDashboardData() {
  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const endpoint = `${baseUrl || ''}/dashboard`;

  try {
    const data = await fetchJson(endpoint);
    return {
      ...mockDashboardData,
      ...data,
      stats: data.stats ?? mockDashboardData.stats,
      services: data.services ?? mockDashboardData.services,
      currentExperiment: data.currentExperiment ?? mockDashboardData.currentExperiment,
      events: data.events ?? mockDashboardData.events,
    };
  } catch {
    return mockDashboardData;
  }
}
