import { z } from 'zod';
import { paymentProviderNames } from '../modules/payments/payment-provider.js';

/**
 * Every environment variable the API reads is declared here.
 * The app refuses to start if any value is missing or invalid.
 * OpenTelemetry reads its own OTEL_* variables; see .env.example.
 */
/** `KEY=` in .env means "not set", not an empty value to validate. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    /** Connection string for the app role. Must NOT be a superuser, or row-level security is bypassed. */
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    /** Schools are served at <slug>.<PLATFORM_DOMAIN>. */
    PLATFORM_DOMAIN: z.string().min(1).default('dopple.localhost'),
    /** How long a resolved host -> tenant mapping is cached in memory. */
    TENANT_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(60),
    /**
     * Ed25519 private key (PKCS#8 PEM) that signs access tokens. Other services
     * verify with the public half. Outside production a throwaway key is generated
     * at boot when this is empty, so tokens stop working after a restart.
     */
    JWT_PRIVATE_KEY: z.string().optional(),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /**
     * Sign-in attempts allowed per client IP per minute (refresh gets 3x this).
     * Counters are in memory: correct for one API instance; move to Redis before scaling out.
     */
    LOGIN_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
    /**
     * A school's web app address, with {host} replaced by <slug>.<PLATFORM_DOMAIN> or the
     * school's custom domain. Locally the web app runs on its own port: http://{host}:3200.
     */
    SCHOOL_URL_FORMAT: z
      .string()
      .regex(
        /^https?:\/\/\{host\}(:\d+)?$/,
        'must look like https://{host} or http://{host}:3200',
      )
      .default('https://{host}'),
    /** New schools allowed per client IP per hour (self-serve sign-up, ADR 0010). */
    SCHOOL_SIGNUPS_PER_HOUR: z.coerce.number().int().positive().default(5),
    /**
     * Who takes fee payments (ADR 0013). `fake` moves no money: local runs and tests.
     * Switching provider is this plus that provider's keys.
     */
    PAYMENT_PROVIDER: z.enum(paymentProviderNames).default('fake'),
    /** `sk_sandbox_…` or `sk_live_…`; the prefix picks Bachs's sandbox or production. */
    BACHS_SECRET_KEY: optional(
      z
        .string()
        .regex(
          /^sk_(sandbox|live)_/,
          'must start with sk_sandbox_ or sk_live_',
        ),
    ),
    /** Signing secret of our webhook endpoint in the Bachs developer portal. */
    BACHS_WEBHOOK_SECRET: optional(z.string()),
  })
  .refine((env) => env.NODE_ENV !== 'production' || !!env.JWT_PRIVATE_KEY, {
    path: ['JWT_PRIVATE_KEY'],
    message: 'is required in production',
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.PAYMENT_PROVIDER !== 'fake',
    {
      path: ['PAYMENT_PROVIDER'],
      message: 'cannot be fake in production',
    },
  )
  .refine(
    (env) =>
      env.PAYMENT_PROVIDER !== 'bachs' ||
      (!!env.BACHS_SECRET_KEY && !!env.BACHS_WEBHOOK_SECRET),
    {
      path: ['BACHS_SECRET_KEY'],
      message:
        'BACHS_SECRET_KEY and BACHS_WEBHOOK_SECRET are required when PAYMENT_PROVIDER=bachs',
    },
  );

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
