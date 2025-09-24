import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ErrTokenInvalid, TOKEN_VALIDATOR } from "..";
import type { ITokenValidator, Requester } from "..";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, RoleType } from "./roles.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        @Inject(TOKEN_VALIDATOR) private readonly tokenValidator: ITokenValidator,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException();
        }

        try {
            const { payload, error, isValid } = await this.tokenValidator.validate(token);

            if (!isValid) throw ErrTokenInvalid.withLog('Token parse failed').withLog(error!.message);

            request['requester'] = payload;
        } catch  {
            throw new UnauthorizedException();
        }
        return true;
    }
}

function extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = (request.headers as any)['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
    constructor(
        private readonly authGuard: AuthGuard,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
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

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const requester = request['requester'] as Requester;
        return requiredRoles.some((role) => requester.role === role);
    }
}