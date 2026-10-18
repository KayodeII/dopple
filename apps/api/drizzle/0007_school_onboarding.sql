CREATE TABLE "school_logos" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_logos_size" CHECK (octet_length("school_logos"."content") <= 204800),
	CONSTRAINT "school_logos_type" CHECK ("school_logos"."content_type" in ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "school_logos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "school_logos" ADD CONSTRAINT "school_logos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_brand_color" CHECK ("tenants"."brand_color" ~ '^#[0-9a-f]{6}$');--> statement-breakpoint
CREATE POLICY "school_logos_tenant_isolation" ON "school_logos" AS PERMISSIVE FOR ALL TO "dopple_app" USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "school_logos_public_read" ON "school_logos" AS PERMISSIVE FOR SELECT TO "dopple_app" USING (true);--> statement-breakpoint
-- Hand-written (ADR 0010). The app role cannot write the tenant registry (0001), so these
-- two SECURITY DEFINER functions are its only way in: one creates a school with its first
-- admin, the other edits the name and colour of the school set for this transaction.
CREATE FUNCTION create_school(
  p_slug text, p_name text, p_city text, p_brand_color text,
  p_admin_email text, p_admin_name text, p_password_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO tenants (slug, name, city, brand_color)
  VALUES (p_slug, p_name, p_city, p_brand_color)
  RETURNING id INTO new_id;
  INSERT INTO users (tenant_id, email, name, role, password_hash)
  VALUES (new_id, lower(p_admin_email), p_admin_name, 'admin', p_password_hash);
  RETURN new_id;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION create_school(text, text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION create_school(text, text, text, text, text, text, text) TO dopple_app;--> statement-breakpoint
CREATE FUNCTION update_school_profile(p_name text, p_brand_color text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE tenants SET name = p_name, brand_color = p_brand_color
  WHERE id = nullif(current_setting('app.tenant_id', true), '')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no school is set for this transaction';
  END IF;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION update_school_profile(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION update_school_profile(text, text) TO dopple_app;
