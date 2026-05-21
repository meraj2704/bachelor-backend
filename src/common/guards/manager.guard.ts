import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Allows the request only when the authenticated user is the manager of a house.
 * Stores the managed houseId on `req.houseId` for the controller to use.
 */
@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const houseId = req.user?.managedHouse?.id;
    if (!houseId) {
      throw new ForbiddenException('Only the house manager can access this resource');
    }
    req.houseId = houseId;
    return true;
  }
}
