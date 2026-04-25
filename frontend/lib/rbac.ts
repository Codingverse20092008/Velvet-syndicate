import { User } from './schema';
import { ForbiddenError, UnauthorizedError } from './errors';

export type Role = 'user' | 'admin';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

const rolePermissions: Record<Role, Permission[]> = {
  user: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'cart', action: 'read' },
    { resource: 'cart', action: 'create' },
    { resource: 'cart', action: 'update' },
    { resource: 'cart', action: 'delete' },
    { resource: 'order', action: 'create' },
    { resource: 'order', action: 'read' },
    { resource: 'product', action: 'read' },
  ],
  admin: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
    { resource: 'cart', action: 'read' },
    { resource: 'cart', action: 'create' },
    { resource: 'cart', action: 'update' },
    { resource: 'cart', action: 'delete' },
    { resource: 'order', action: 'read' },
    { resource: 'order', action: 'create' },
    { resource: 'order', action: 'update' },
    { resource: 'order', action: 'delete' },
    { resource: 'product', action: 'read' },
    { resource: 'product', action: 'create' },
    { resource: 'product', action: 'update' },
    { resource: 'product', action: 'delete' },
    { resource: 'product', action: 'manage' },
  ],
};

export function hasPermission(role: Role, resource: string, action: string): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.some((p) => p.resource === resource && (p.action === action || p.action === 'manage'));
}

export function requirePermission(user: User, resource: string, action: string): void {
  if (!hasPermission(user.role as Role, resource, action)) {
    throw new ForbiddenError(`You do not have permission to ${action} ${resource}`);
  }
}

export function requireRole(user: User, ...roles: Role[]): void {
  if (!roles.includes(user.role as Role)) {
    throw new ForbiddenError('Insufficient role');
  }
}

export function authenticateUser(payload: { userId: string; email: string; role: string }): User {
  if (!payload.userId || !payload.email || !payload.role) {
    throw new UnauthorizedError('Invalid token payload');
  }

  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    passwordHash: '',
    createdAt: '',
    updatedAt: '',
  } as User;
}