import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthRequest } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return request.user;
  },
);
