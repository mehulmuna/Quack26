import { mockDashboardData } from '../data/mockDashboard';

function apiUrl(path) {
  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  return `${baseUrl}${path}`;
}

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeReport(report) {
  return {
    ...report,
    report_type: report.report_type || 'analysis',
    status: report.status || 'complete',
    created_date: report.created_date || report.updatedAt,
  };
}

function normalizeDashboardData(data) {
  return {
    ...mockDashboardData,
    ...data,
    status: data.status ?? { running: false },
    config: data.config ?? { name: '', directory: '', commands: [] },
    stats: data.stats ?? { toolsCalled: 0, tokensUsed: 0, duration: 0 },
    services: data.services ?? [],
    reports: (data.reports ?? []).map(normalizeReport),
    traceEvents: data.traceEvents ?? [],
  };
}

export async function getDashboardData() {
  try {
    return normalizeDashboardData(await fetchJson(apiUrl('/dashboard')));
  } catch (error) {
    return normalizeDashboardData({
      ok: false,
      error: error.message,
      services: [],
      reports: [],
      traceEvents: [],
    });
  }
}

export async function getReport(reportId) {
  return normalizeReport(await fetchJson(apiUrl(`/reports/${encodeURIComponent(reportId)}`)));
}

export async function getIsRunning() {
  return fetchJson(apiUrl('/isRunning'));
}

export async function startScan(config) {
  return fetchJson(apiUrl('/start'), {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function stopScan() {
  return fetchJson(apiUrl('/stop'), { method: 'POST' });
}
