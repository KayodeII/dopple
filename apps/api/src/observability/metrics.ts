import { metrics } from '@opentelemetry/api';

/**
 * Custom business metrics. HTTP latency, status codes and database timings
 * already come from auto-instrumentation; add only what those can't tell you.
 */
const meter = metrics.getMeter('dopple-api');

export const tenantRequests = meter.createCounter('dopple.tenant.requests', {
  description: 'Requests resolved to a school, by tenant',
});

export const unknownHostRequests = meter.createCounter(
  'dopple.tenant.unknown_host',
  { description: 'Requests whose host did not match any school' },
);

export const signIns = meter.createCounter('dopple.auth.sign_ins', {
  description: 'Password sign-in attempts, by outcome (success, failure)',
});

export const refreshTokenReuse = meter.createCounter(
  'dopple.auth.refresh_token_reuse',
  {
    description: 'A revoked refresh token was presented again (possible theft)',
  },
);

export const feePaymentsReceived = meter.createCounter(
  'dopple.fees.payments_received',
  {
    description: 'Fee payments confirmed by the payment provider, by provider',
  },
);
