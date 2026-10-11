import type { UserRole } from '../../database/schema.js';

/** The signed-in user for this request. Stored in request context under PRINCIPAL_KEY by AuthGuard. */
export interface Principal {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export const PRINCIPAL_KEY = 'principal';
