# 0003 — Observability with OpenTelemetry

- Status: accepted
- Date: 2026-10-11

## Context

We need to see latency, errors and load per school, especially at the morning bell, and to jump from a log line to its trace.

## Decision

- OpenTelemetry Node SDK, started before the app with `node --import ./dist/instrumentation.js`. The app is ESM, so instrumentation must load first; importing it from `main.ts` is too late.
- Auto-instrumentation for HTTP, Express, Postgres and pino; fs, dns and net are disabled as noise.
- Exporters are configured only through standard `OTEL_*` variables (OTLP by default; `console` for local debugging).
- Logs: pino JSON via nestjs-pino. The pino instrumentation adds `trace_id` and `span_id`; every request log also carries `tenantId` and `tenantSlug`.
- Every span on a tenant request carries `tenant.id` and `tenant.slug`.
- Locally, `grafana/otel-lgtm` provides collector, Tempo, Prometheus and Loki in one container.

## Consequences

- Production can switch backends (Grafana Cloud, Honeycomb, Datadog) by changing environment variables only.
- Custom metrics live in `src/observability/metrics.ts`; keep tenant labels to slugs (bounded) and never add per-student labels.
