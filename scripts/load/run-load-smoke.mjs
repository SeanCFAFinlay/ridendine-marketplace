#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';
const DEFAULT_ITERATIONS = Number(process.env.LOAD_ITERATIONS || 40);
const DEFAULT_CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 8);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function runScenario({ name, requestFactory, iterations, concurrency }) {
  const durations = [];
  let errors = 0;
  let limited = 0;

  let inFlight = 0;
  let pointer = 0;

  return await new Promise((resolve) => {
    const launchNext = () => {
      while (inFlight < concurrency && pointer < iterations) {
        pointer += 1;
        inFlight += 1;
        const started = performance.now();

        const req = requestFactory();
        fetch(req.url, req.init)
          .then(async (response) => {
            const ended = performance.now();
            durations.push(ended - started);
            if (response.status >= 500) errors += 1;
            if (response.status === 429) limited += 1;
            await response.arrayBuffer();
          })
          .catch(() => {
            const ended = performance.now();
            durations.push(ended - started);
            errors += 1;
          })
          .finally(() => {
            inFlight -= 1;
            if (pointer >= iterations && inFlight === 0) {
              const totalMs = durations.reduce((acc, v) => acc + v, 0);
              resolve({
                name,
                requests: durations.length,
                errorRate: durations.length ? (errors / durations.length) * 100 : 0,
                rateLimited: limited,
                p50: percentile(durations, 50),
                p95: percentile(durations, 95),
                p99: percentile(durations, 99),
                avg: durations.length ? totalMs / durations.length : 0,
              });
              return;
            }
            launchNext();
          });
      }
    };

    launchNext();
  });
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
  };
}

async function main() {
  const { dryRun } = parseArgs();
  const baseUrl = DEFAULT_BASE_URL.replace(/\/+$/, '');
  const scenarios = [
    {
      name: 'health',
      requestFactory: () => ({ url: `${baseUrl}/api/health`, init: { method: 'GET' } }),
      iterations: DEFAULT_ITERATIONS,
      concurrency: DEFAULT_CONCURRENCY,
    },
    {
      name: 'support-write-rate-limit',
      requestFactory: () => ({
        url: `${baseUrl}/api/support`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Load Test',
            email: 'load@example.com',
            subject: 'Load test',
            message: 'Load test request payload',
            category: 'other',
          }),
        },
      }),
      iterations: DEFAULT_ITERATIONS,
      concurrency: DEFAULT_CONCURRENCY,
    },
  ];

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          baseUrl,
          iterations: DEFAULT_ITERATIONS,
          concurrency: DEFAULT_CONCURRENCY,
          scenarios: scenarios.map((s) => s.name),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Running load smoke against ${baseUrl}`);
  const startedAt = Date.now();
  const results = [];
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
    console.log(
      `[${result.name}] requests=${result.requests} p95=${result.p95.toFixed(1)}ms errors=${result.errorRate.toFixed(2)}% rateLimited=${result.rateLimited}`
    );
  }
  const elapsedMs = Date.now() - startedAt;
  console.log(JSON.stringify({ elapsedMs, results }, null, 2));
}

main().catch((error) => {
  console.error('load smoke failed', error);
  process.exit(1);
});
