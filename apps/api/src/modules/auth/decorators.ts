import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../database/schema.js';

export const IS_PUBLIC = 'auth:public';
export const ROLES = 'auth:roles';

/** Every route needs a signed-in user unless marked @Public(). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restrict a route (or controller) to these roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
