import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthRequest extends Request {
  user: { sub: number; email: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }
    try {
      request.user = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }
}
