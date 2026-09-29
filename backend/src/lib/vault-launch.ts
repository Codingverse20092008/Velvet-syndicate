import { Request, Response, NextFunction } from 'express';
import { getUserFromRequest } from './auth-express';
import { ForbiddenError, UnauthorizedError } from './errors';

const LAUNCH_DATE_ENV = process.env.VELVET_VAULT_LAUNCH_DATE || '2026-06-20T12:00:00+05:30';

function getLaunchDate(): Date {
  return new Date(LAUNCH_DATE_ENV);
}

export function isVaultLive(): boolean {
  const now = new Date();
  return now >= getLaunchDate();
}

/**
 * Middleware that protects vault APIs.
 *
 * Before launch: only admins can access.
 * After launch: any authenticated user can access.
 */
export function vaultLaunchGuard(req: Request, _res: Response, next: NextFunction) {
  if (isVaultLive()) {
    // After launch: require any authenticated user
    getUserFromRequest(req)
      .then((user) => {
        if (user) {
          return next();
        }
        throw new UnauthorizedError('Authentication required.');
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          return next(err);
        }
        return next(new UnauthorizedError('Authentication required.'));
      });
    return;
  }

  // Before launch: admin only
  getUserFromRequest(req)
    .then((user) => {
      if (user.role === 'admin' || user.role === 'super_admin') {
        return next();
      }
      throw new ForbiddenError('Velvet Vault is not yet available.');
    })
    .catch((err) => {
      if (err instanceof ForbiddenError) {
        return next(err);
      }
      return next(new ForbiddenError('Velvet Vault is not yet available.'));
    });
}
