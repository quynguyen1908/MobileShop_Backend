import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrTokenInvalid, TOKEN_VALIDATOR } from '..';
import type { ITokenValidator, Requester } from '..';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleType } from './roles.decorator';
import { Request } from 'express';

// Định nghĩa interface cho request với requester
interface RequestWithRequester extends Request {
  requester?: Requester;
}

@Injectable()
export class RemoteAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VALIDATOR) private readonly tokenValidator: ITokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithRequester>();
    const token = extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const { payload, error, isValid } =
        await this.tokenValidator.validate(token);

      if (!isValid)
        throw ErrTokenInvalid.withLog('Token parse failed').withLog(
          error!.message,
        );

      if (payload) {
        request.requester = payload;
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

function extractTokenFromHeader(
  request: RequestWithRequester,
): string | undefined {
  const authHeader = request.headers.authorization;
  if (!authHeader) return undefined;

  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' ? token : undefined;
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authGuard: RemoteAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithRequester>();
    const token = extractTokenFromHeader(request);

    if (!token) {
      return true;
    }
    return this.authGuard.canActivate(context);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithRequester>();
    const requester = request.requester;

    // Kiểm tra nếu requester không tồn tại hoặc không có role
    if (!requester || !requester.role) {
      return false;
    }

    return requiredRoles.some((role) => (requester.role as RoleType) === role);
  }
}
