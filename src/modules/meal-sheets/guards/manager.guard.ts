import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

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
