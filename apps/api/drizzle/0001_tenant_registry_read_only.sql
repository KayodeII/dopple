-- The tenant registry is managed by the control plane (and the seed script), never by the app role.
REVOKE INSERT, UPDATE, DELETE ON "tenants" FROM "dopple_app";
