/** The school a request belongs to. Stored in request context (nestjs-cls) under TENANT_KEY. */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export const TENANT_KEY = 'tenant';
