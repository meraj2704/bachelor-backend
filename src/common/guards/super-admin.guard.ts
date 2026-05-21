import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Allows the request only when the authenticated user is a platform super admin.
 * Use after JwtAuthGuard so `req.user` is populated.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }
    return true;
  }
}
