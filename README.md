# PsychoPunch

PsychoPunch is an agentic chaos engineering platform designed to identify and report on architectural vulnerabilities. Unlike traditional tools that execute random failures, PsychoPunch uses an agentic system to design targeted experiments based on codebase analysis and technical hypotheses.

## Overview

Chaos engineering is critical for building resilient systems, but manual experiment design is resource-intensive. PsychoPunch automates this process by:
- Analyzing codebases to form failure hypotheses.
- Executing controlled fault injections using specialized tooling.
- Generating technical reliability reports documenting scaling bottlenecks and resilience gaps.

## Technical Features

The agent interfaces with the infrastructure layer to simulate various failure modes:
- Network Controls: Injection of latency, packet loss, and network partitions.
- Docker Orchestration: Container lifecycle management and service outage simulation.
- Resource Management: CPU and memory limits for testing behavior under resource starvation.
- Persistent Memory: A Retrieval-Augmented Generation (RAG) system using the BM25 algorithm to fetch historical context from past traces and reports.

## User Interface

The dashboard provides real-time observability across three panels:
1. Activity Feed: Real-time statistics, active tool logs, and a terminal view of the agent's environment.
2. Command Center: Input for codebase analysis and experiment targeting.
3. Documentation: Access to the persistent memory system, tool traces, and historical chaos engineering reports.

## Target Audience

PsychoPunch is designed for teams managing high-availability systems:
- DevOps and Site Reliability Engineers
- Platform Engineering teams
- Observability and QA teams

## Getting Started

### Prerequisites
- Docker Desktop (active)
- Node.js (v20+)
- Gemini API Key
- Codex (optional)

### Installation
1. Install Dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Configure Environment:
   Create a `.env` file in the `backend/` directory with `GEMINI_API_KEY`.

3. Launch:
   ```bash
   # Backend (Port 3002)
   cd backend && npm run start

   # Frontend (Port 5173)
   cd frontend && npm run dev
   ```

## Roadmap

- Advanced Context Retrieval: Integration with vector databases for semantic search.
- Expanded Tooling: Automated ingestion of logs, metrics, and distributed traces.
- Incident Correlation: Mapping historical production incidents to automated regression testing.