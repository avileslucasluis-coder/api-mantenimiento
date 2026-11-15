import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const publicUser = { id: true, nombre: true, email: true, rol: true } as const;

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private readonly db: DatabaseService, private readonly jwt: JwtService) {}
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    await this.db.usuario.upsert({ where: { email }, update: {}, create: {
      nombre: 'Administrador', email, passwordHash: await hashPassword(password), rol: 'ADMIN',
    } });
  }
  async login(dto: LoginDto) {
    const user = await this.db.usuario.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user || !await verifyPassword(dto.password, user.passwordHash)) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    return this.session(user.id);
  }
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.db.usuario.findUnique({ where: { email } })) throw new ConflictException('Este correo ya está registrado.');
    const user = await this.db.usuario.create({ data: { email, nombre: dto.nombre.trim(), passwordHash: await hashPassword(dto.password) } });
    return this.session(user.id);
  }
  async session(id: string) {
    const user = await this.db.usuario.findUniqueOrThrow({ where: { id }, select: publicUser });
    return { accessToken: await this.jwt.signAsync({ sub: user.id }), user };
  }
}
