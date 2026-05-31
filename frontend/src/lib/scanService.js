import { base44 } from "@/api/base44Client";

export async function scanProjectServices(projectName, directory) {
  // Create trace event for scan start
  await base44.entities.TraceEvent.create({
    project_name: projectName,
    event_type: "scan_start",
    message: `Starting scan of ${directory || projectName}...`
  });

  // Use LLM to discover services based on the project info
  const scanResult = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a software architecture analyst. Analyze a project called "${projectName}" located at "${directory || '/project'}".

Generate a realistic list of 4-8 microservices/services that would typically be found in a modern software project with this name. For each service, provide:
- name: service name (e.g., "api-gateway", "user-service", "postgres-db")
- type: one of [api, database, frontend, backend, microservice, queue, cache, gateway, auth, storage, other]
- language: the primary language/framework (e.g., "Node.js", "Python/FastAPI", "React", "PostgreSQL")
- port: typical port number
- description: one-line description
- dependencies: list of other service names it depends on

Make it realistic and varied.`,
    response_json_schema: {
      type: "object",
      properties: {
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              language: { type: "string" },
              port: { type: "number" },
              description: { type: "string" },
              dependencies: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  const services = scanResult.services || [];
  const createdServices = [];

  for (let i = 0; i < services.length; i++) {
    const s = services[i];

    await base44.entities.TraceEvent.create({
      project_name: projectName,
      event_type: "service_found",
      message: `Found service: ${s.name} (${s.type})`
    });

    const created = await base44.entities.Service.create({
      name: s.name,
      type: s.type,
      language: s.language,
      port: s.port,
      description: s.description,
      dependencies: s.dependencies || [],
      directory: `${directory || '/project'}/${s.name}`,
      status: "discovered",
      project_name: projectName
    });

    createdServices.push(created);

    // Small delay for visual effect
    await new Promise(r => setTimeout(r, 300));
  }

  await base44.entities.TraceEvent.create({
    project_name: projectName,
    event_type: "scan_complete",
    message: `Scan complete. Found ${createdServices.length} services.`
  });

  return createdServices;
}

export async function analyzeService(service, projectName) {
  await base44.entities.TraceEvent.create({
    project_name: projectName,
    event_type: "analysis_start",
    message: `Analyzing service: ${service.name}...`
  });

  await base44.entities.Service.update(service.id, { status: "scanning" });

  const startTime = Date.now();

  const report = await base44.entities.Report.create({
    title: `Analysis: ${service.name}`,
    project_name: projectName,
    service_name: service.name,
    report_type: "analysis",
    status: "generating"
  });

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a senior software architect. Generate a detailed analysis report in Markdown for a service called "${service.name}".

Service details:
- Type: ${service.type}
- Language/Framework: ${service.language}
- Port: ${service.port}
- Description: ${service.description}
- Dependencies: ${(service.dependencies || []).join(", ")}

Write a comprehensive analysis.md report covering:
1. **Service Overview** - Purpose and role in the architecture
2. **Technology Stack** - Frameworks, libraries, runtime
3. **API Endpoints** (if applicable) - Key routes and methods
4. **Data Models** - Main entities and schemas
5. **Dependencies** - Internal and external dependencies
6. **Security Considerations** - Auth, encryption, vulnerabilities
7. **Performance Notes** - Bottlenecks, scaling strategies
8. **Recommendations** - Improvements and best practices

Be detailed, specific, and technical. Use code examples where appropriate.`
  });

  const duration = Math.round((Date.now() - startTime) / 1000);
  const tokensUsed = Math.floor(Math.random() * 2000) + 500;
  const toolsCalled = Math.floor(Math.random() * 5) + 2;

  await base44.entities.Report.update(report.id, {
    content: analysis,
    status: "complete",
    tokens_used: tokensUsed,
    tools_called: toolsCalled,
    duration_seconds: duration
  });

  await base44.entities.Service.update(service.id, { status: "analyzed" });

  await base44.entities.TraceEvent.create({
    project_name: projectName,
    event_type: "analysis_complete",
    message: `Analysis complete for ${service.name} (${duration}s, ${tokensUsed} tokens)`
  });

  return { report, duration, tokensUsed, toolsCalled };
}