CREATE TABLE "learn_questions" (
	"topic_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"prompt" text NOT NULL,
	"options" text[] NOT NULL,
	"answer" smallint NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "learn_questions_topic_id_position_pk" PRIMARY KEY("topic_id","position"),
	CONSTRAINT "learn_questions_four_options" CHECK (cardinality("learn_questions"."options") = 4),
	CONSTRAINT "learn_questions_answer" CHECK ("learn_questions"."answer" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "learn_subjects" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"classes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learn_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"class_level" text NOT NULL,
	"subject_slug" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"minutes" smallint NOT NULL,
	"lesson" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learn_topics_slug_unique" UNIQUE("slug"),
	CONSTRAINT "learn_topics_class_level" CHECK (class_level in ('nursery-1', 'nursery-2', 'primary-1', 'primary-2', 'primary-3', 'primary-4', 'primary-5', 'primary-6', 'jss-1', 'jss-2', 'jss-3', 'ss-1', 'ss-2', 'ss-3'))
);
--> statement-breakpoint
ALTER TABLE "learn_questions" ADD CONSTRAINT "learn_questions_topic_id_learn_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."learn_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learn_topics" ADD CONSTRAINT "learn_topics_subject_slug_learn_subjects_slug_fk" FOREIGN KEY ("subject_slug") REFERENCES "public"."learn_subjects"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Hand-written (ADR 0011): Learn content is loaded by the owner from content/learn/; the app
-- role only reads it, like the tenant registry (0001).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "learn_subjects", "learn_topics", "learn_questions" FROM "dopple_app";--> statement-breakpoint
GRANT SELECT ON "learn_subjects", "learn_topics", "learn_questions" TO "dopple_app";
