ALTER TABLE "tenants" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_accent_color" CHECK ("tenants"."accent_color" ~ '^#[0-9a-f]{6}$');--> statement-breakpoint
-- Hand-written (ADR 0010): the profile function also sets the accent colour now. Dropped
-- and recreated because adding a parameter makes a new function, and the old two-argument
-- one would otherwise linger with its grant.
DROP FUNCTION update_school_profile(text, text);--> statement-breakpoint
CREATE FUNCTION update_school_profile(p_name text, p_brand_color text, p_accent_color text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE tenants SET name = p_name, brand_color = p_brand_color, accent_color = p_accent_color
  WHERE id = nullif(current_setting('app.tenant_id', true), '')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no school is set for this transaction';
  END IF;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION update_school_profile(text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION update_school_profile(text, text, text) TO dopple_app;
