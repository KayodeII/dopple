CREATE TABLE "consents" (
	"tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"given" boolean NOT NULL,
	"method" text NOT NULL,
	"wording" text NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consents_tenant_id_id_pk" PRIMARY KEY("tenant_id","id"),
	CONSTRAINT "consents_purpose" CHECK ("consents"."purpose" in ('record', 'health', 'photo')),
	CONSTRAINT "consents_method" CHECK ("consents"."method" in ('paper', 'online'))
);
--> statement-breakpoint
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "record_corrections" (
	"tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"reply" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_corrections_tenant_id_id_pk" PRIMARY KEY("tenant_id","id"),
	CONSTRAINT "record_corrections_status" CHECK ("record_corrections"."status" in ('pending', 'applied', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "record_corrections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_tenant_id_student_id_students_tenant_id_id_fk" FOREIGN KEY ("tenant_id","student_id") REFERENCES "public"."students"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_tenant_id_guardian_id_guardians_tenant_id_id_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_tenant_id_recorded_by_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id","recorded_by") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_tenant_id_student_id_students_tenant_id_id_fk" FOREIGN KEY ("tenant_id","student_id") REFERENCES "public"."students"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_tenant_id_requested_by_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id","requested_by") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_tenant_id_decided_by_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id","decided_by") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "consents_tenant_isolation" ON "consents" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "record_corrections_tenant_isolation" ON "record_corrections" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Hand-written: consent answers are a log. The app adds to it and never rewrites it;
-- rows go only when the child or guardian is removed (cascades run as the owner).
REVOKE UPDATE, DELETE, TRUNCATE ON "consents" FROM "dopple_app";
