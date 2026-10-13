-- btree_gist lets the exclusion constraint below mix equality (tenant, class, term, day) with range overlap. It is a trusted extension, so the owner role can create it.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_id_session" UNIQUE("tenant_id","id","session_id");--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"tenant_id" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_slots_tenant_id_id_pk" PRIMARY KEY("tenant_id","id"),
	CONSTRAINT "timetable_slots_weekday" CHECK ("timetable_slots"."weekday" between 1 and 7),
	CONSTRAINT "timetable_slots_times" CHECK ("timetable_slots"."ends_at" > "timetable_slots"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "timetable_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_tenant_id_term_id_session_id_terms_tenant_id_id_session_id_fk" FOREIGN KEY ("tenant_id","term_id","session_id") REFERENCES "public"."terms"("tenant_id","id","session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_tenant_id_class_id_session_id_classes_tenant_id_id_session_id_fk" FOREIGN KEY ("tenant_id","class_id","session_id") REFERENCES "public"."classes"("tenant_id","id","session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_tenant_id_class_id_subject_id_class_subjects_tenant_id_class_id_subject_id_fk" FOREIGN KEY ("tenant_id","class_id","subject_id") REFERENCES "public"."class_subjects"("tenant_id","class_id","subject_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "timetable_slots_tenant_isolation" ON "timetable_slots" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Hand-written: drizzle-kit cannot express exclusion constraints. A class's periods in a term may not overlap on the same day; times are compared as minutes after midnight, half-open, so 08:40 to 09:20 may follow 08:00 to 08:40.
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_no_overlap" EXCLUDE USING gist ("tenant_id" WITH =, "class_id" WITH =, "term_id" WITH =, "weekday" WITH =, int4range((extract(epoch from "starts_at") / 60)::int, (extract(epoch from "ends_at") / 60)::int) WITH &&);
