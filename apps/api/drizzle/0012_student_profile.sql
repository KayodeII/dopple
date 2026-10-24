CREATE TABLE "student_health" (
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"blood_group" text,
	"genotype" text,
	"allergies" text,
	"conditions" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_health_tenant_id_student_id_pk" PRIMARY KEY("tenant_id","student_id"),
	CONSTRAINT "student_health_blood_group" CHECK ("student_health"."blood_group" in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
	CONSTRAINT "student_health_genotype" CHECK ("student_health"."genotype" in ('AA', 'AS', 'AC', 'SS', 'SC', 'CC'))
);
--> statement-breakpoint
ALTER TABLE "student_health" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_photos" (
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_photos_tenant_id_student_id_pk" PRIMARY KEY("tenant_id","student_id"),
	CONSTRAINT "student_photos_size" CHECK (octet_length("student_photos"."content") <= 204800),
	CONSTRAINT "student_photos_type" CHECK ("student_photos"."content_type" in ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "student_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "sex" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "admitted_on" date;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "state_of_origin" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "lga" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "home_address" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "previous_school" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "religion" text;--> statement-breakpoint
ALTER TABLE "student_health" ADD CONSTRAINT "student_health_tenant_id_student_id_students_tenant_id_id_fk" FOREIGN KEY ("tenant_id","student_id") REFERENCES "public"."students"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_photos" ADD CONSTRAINT "student_photos_tenant_id_student_id_students_tenant_id_id_fk" FOREIGN KEY ("tenant_id","student_id") REFERENCES "public"."students"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_sex" CHECK ("students"."sex" in ('female', 'male'));--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_religion" CHECK ("students"."religion" in ('christianity', 'islam', 'other'));--> statement-breakpoint
CREATE POLICY "student_health_tenant_isolation" ON "student_health" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "student_photos_tenant_isolation" ON "student_photos" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);