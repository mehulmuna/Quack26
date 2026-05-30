export const mockDashboardData = {
  stats: [
    {
      label: 'Total Experiments',
      value: '128',
      trend: '+18% this week',
    },
    {
      label: 'Services Monitored',
      value: '12',
      trend: '3 critical paths',
    },
    {
      label: 'Active Attack',
      value: 'Packet Loss',
      trend: 'Running on auth stack',
    },
    {
      label: 'Failures Found',
      value: '37',
      trend: '11 newly detected',
    },
  ],
  services: [
    {
      name: 'Auth Service',
      status: 'Healthy',
      risk: 82,
      summary: 'Login latency increases under intermittent packet loss.',
      incident: 'JWT refresh path is the most fragile endpoint.',
    },
    {
      name: 'Database',
      status: 'Healthy',
      risk: 65,
      summary: 'Connection pool is stable but close to saturation.',
      incident: 'Query bursts create a visible retry tail.',
    },
    {
      name: 'API Gateway',
      status: 'Healthy',
      risk: 34,
      summary: 'Routing remains predictable with small jitter spikes.',
      incident: 'Ingress timeout is the current watch item.',
    },
  ],
  currentExperiment: {
    target: 'Auth Service',
    attack: 'Packet Loss',
    status: 'Running',
    progress: 65,
    impact: 'User login failures increased by 24% after the chaos event began.',
  },
  events: [
    {
      time: '12:02',
      title: 'Loaded Auth Service',
      detail: 'Baseline metrics captured and health checks passed.',
    },
    {
      time: '12:04',
      title: 'Injected 50% Packet Loss',
      detail: 'Traffic shaping is now stressing the login flow.',
    },
    {
      time: '12:05',
      title: 'Detected Login Failure',
      detail: 'Retry storms started surfacing in the auth cluster.',
    },
    {
      time: '12:06',
      title: 'Generated Root Cause Analysis',
      detail: 'Root cause points to handshake timing and queue pressure.',
    },
  ],
};
