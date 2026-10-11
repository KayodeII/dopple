/**
 * OpenTelemetry bootstrap. Loaded BEFORE the app with `node --import ./dist/instrumentation.js`
 * (see package.json scripts). It must not be imported from main.ts: in ESM, static imports are
 * linked before any code runs, so libraries would load before they could be instrumented.
 *
 * Exporters are chosen by the standard OTEL_* environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT   where to send traces and metrics (default http://localhost:4318)
 *   OTEL_TRACES_EXPORTER          otlp | console | none
 *   OTEL_METRICS_EXPORTER         otlp | console | none
 *   OTEL_SERVICE_NAME             service name shown in Grafana
 */
import { register } from 'node:module';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NodeSDK } from '@opentelemetry/sdk-node';

// Lets OpenTelemetry patch ES modules (express, pg, pino) as they are imported.
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

process.env.OTEL_SERVICE_NAME ??= 'dopple-api';

// Only the libraries Dopple actually uses. Add one here when you add a library worth tracing.
const sdk = new NodeSDK({
  instrumentations: [
    new HttpInstrumentation(), // incoming and outgoing HTTP
    new ExpressInstrumentation(), // route spans under Nest's Express adapter
    new NestInstrumentation(), // controller/handler spans
    new PgInstrumentation(), // every Postgres query
    new PinoInstrumentation(), // adds trace_id/span_id to log lines
    new UndiciInstrumentation(), // fetch() calls to other services
  ],
});

sdk.start();

const shutdown = () => {
  sdk.shutdown().catch((error: unknown) => {
    console.error('OpenTelemetry shutdown failed', error);
  });
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
