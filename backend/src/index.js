
require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const dashboardData = {
	kpis: {
		experimentsRun: 42,
		servicesMonitored: 8,
		issuesFound: 6,
		reportsGenerated: 12,
	},
	services: [
		{
			name: 'Auth Service',
			status: 'Healthy',
			risk: 89,
			dependencies: 4,
		},
		{
			name: 'Payment Service',
			status: 'Healthy',
			risk: 76,
			dependencies: 3,
		},
		{
			name: 'Database',
			status: 'Healthy',
			risk: 63,
			dependencies: 2,
		},
		{
			name: 'API Gateway',
			status: 'Healthy',
			risk: 38,
			dependencies: 3,
		},
		{
			name: 'Frontend',
			status: 'Healthy',
			risk: 22,
			dependencies: 1,
		},
	],
	activeExperiment: {
		target: 'Auth Service',
		attack: '50% Packet Loss',
		status: 'Running',
		duration: '2m 13s',
		expectedImpact: 'Login failures',
		progress: 80,
		message: 'Injecting packet loss...',
	},
	infrastructure: {
		containers: [
			{ name: 'frontend', status: 'Running' },
			{ name: 'api-gateway', status: 'Running' },
			{ name: 'auth-service', status: 'Degraded' },
			{ name: 'database', status: 'Running' },
		],
		summary: {
			total: 4,
			healthy: 3,
			degraded: 1,
			offline: 0,
		},
	},
	activeEffects: ['50% Packet Loss on Auth Service', '2000ms Latency on Payment Service'],
	issues: [
		{ severity: 'HIGH', title: 'Auth Service lacks retry logic' },
		{ severity: 'HIGH', title: 'Database is single point of failure' },
		{ severity: 'MEDIUM', title: 'API Gateway timeout too low' },
		{ severity: 'LOW', title: 'Missing health check endpoint' },
	],
	activityFeed: [
		{ time: '12:01', message: 'Loaded codebase' },
		{ time: '12:02', message: 'Identified Auth Service' },
		{ time: '12:03', message: 'Calculated risk score' },
		{ time: '12:04', message: 'Started packet loss attack' },
		{ time: '12:05', message: 'Detected login failures' },
		{ time: '12:06', message: 'Generated root cause report' },
	],
	tools: [
		{ name: 'Memory System', usageCount: 34 },
		{ name: 'Docker Tool', usageCount: 18 },
		{ name: 'Packet Loss Tool', usageCount: 7 },
		{ name: 'Latency Tool', usageCount: 5 },
		{ name: 'Fetch Tool', usageCount: 19 },
		{ name: 'Code Analyzer', usageCount: 13 },
		{ name: 'Gemini', usageCount: 22 },
	],
	reports: [
		{
			id: 'rca-12',
			title: 'Root Cause Analysis #12 - Auth Service Failure',
			summary: 'Root cause: database timeout cascade under packet loss.',
			recommendation: 'Add retry logic and deploy read replica',
		},
		{
			id: 'chaos-11',
			title: 'Chaos Test #11 - Packet Loss Experiment',
			summary: 'Packet loss generated elevated login error rates.',
			recommendation: 'Tune timeout and backoff strategy',
		},
		{
			id: 'security-7',
			title: 'Security Finding #7 - Missing Retry Logic',
			summary: 'Auth dependency failures are not gracefully handled.',
			recommendation: 'Introduce circuit breaker and retries',
		},
	],
};

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

app.get('/dashboard', (_req, res) => {
	res.json(dashboardData);
});

app.listen(port, () => {
	console.log(`Express API listening on http://localhost:${port}`);
});