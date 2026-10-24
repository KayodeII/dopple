CREATE TABLE "fee_payments" (
	"tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fee_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"checkout_id" text,
	"amount_minor" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payer_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_payments_tenant_id_id_pk" PRIMARY KEY("tenant_id","id"),
	CONSTRAINT "fee_payments_amount_positive" CHECK ("fee_payments"."amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "fee_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fees" (
	"tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"due_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fees_tenant_id_id_pk" PRIMARY KEY("tenant_id","id"),
	CONSTRAINT "fees_amount_positive" CHECK ("fees"."amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "fees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"requirements_due" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_accounts_tenant_id_provider_pk" PRIMARY KEY("tenant_id","provider")
);
--> statement-breakpoint
ALTER TABLE "payment_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_events" (
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_tenant_id_provider_event_id_pk" PRIMARY KEY("tenant_id","provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_tenant_id_fee_id_fees_tenant_id_id_fk" FOREIGN KEY ("tenant_id","fee_id") REFERENCES "public"."fees"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_tenant_id_payer_id_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id","payer_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_tenant_id_student_id_students_tenant_id_id_fk" FOREIGN KEY ("tenant_id","student_id") REFERENCES "public"."students"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "fee_payments_tenant_isolation" ON "fee_payments" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "fees_tenant_isolation" ON "fees" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payment_accounts_tenant_isolation" ON "payment_accounts" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payment_events_tenant_isolation" ON "payment_events" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);