ALTER TABLE "tenants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "showcase" boolean DEFAULT false NOT NULL;