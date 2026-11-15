import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service.js';
import { publicUser } from './auth.service.js';

export const Public = () => SetMetadata('public', true);
export const Admin = () => SetMetadata('admin', true);
export type AuthRequest = Request & { user: { id: string; nombre: string; email: string; rol: string } };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly db: DatabaseService) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets)) return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión para continuar.');
    let id: string;
    try { id = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub; }
    catch { throw new UnauthorizedException('Tu sesión venció. Vuelve a iniciar sesión.'); }
    const user = await this.db.usuario.findUnique({ where: { id }, select: publicUser });
    if (!user) throw new UnauthorizedException();
    req.user = user;
    if (this.reflector.getAllAndOverride<boolean>('admin', targets) && user.rol !== 'ADMIN') throw new ForbiddenException('Esta acción requiere el rol de administrador.');
    return true;
  }
}
