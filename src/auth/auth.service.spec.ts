import { describe, it, expect, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service.js';
import { AuthService, hashPassword, verifyPassword, publicUser } from './auth.service.js';

function fixture() {
  const usuario = {
    findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), upsert: vi.fn(),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') };
  const service = new AuthService(
    { usuario } as unknown as DatabaseService,
    jwt as unknown as JwtService,
  );
  return { service, usuario, jwt };
}

describe('Autenticación', () => {
  it('genera un hash que no contiene la contraseña', async () => {
    expect(await hashPassword('clave-de-prueba')).not.toContain('clave-de-prueba');
  });
  it('usa una sal distinta en cada hash', async () => {
    expect(await hashPassword('misma-clave')).not.toBe(await hashPassword('misma-clave'));
  });
  it('verifica la contraseña correcta', async () => {
    expect(await verifyPassword('correcta', await hashPassword('correcta'))).toBe(true);
  });
  it('rechaza una contraseña incorrecta', async () => {
    expect(await verifyPassword('incorrecta', await hashPassword('correcta'))).toBe(false);
  });
  it('rechaza hashes sin formato', async () => {
    expect(await verifyPassword('clave', 'invalido')).toBe(false);
  });
  it('rechaza un usuario inexistente con 401', async () => {
    const { service, usuario } = fixture();
    usuario.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'nadie@example.com', password: 'incorrecta' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('normaliza el correo antes de consultarlo', async () => {
    const { service, usuario } = fixture();
    usuario.findUnique.mockResolvedValue(null);
    await service.login({ email: ' ANA@EXAMPLE.COM ', password: 'incorrecta' }).catch(() => {});
    expect(usuario.findUnique).toHaveBeenCalledWith({ where: { email: 'ana@example.com' } });
  });
  it('rechaza una contraseña incorrecta aunque exista el usuario', async () => {
    const { service, usuario } = fixture();
    usuario.findUnique.mockResolvedValue({ passwordHash: await hashPassword('correcta') });
    await expect(service.login({ email: 'ana@example.com', password: 'incorrecta' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rechaza el registro duplicado sin crear un usuario', async () => {
    const { service, usuario } = fixture();
    usuario.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.register({ nombre: 'Ana', email: 'ana@example.com', password: 'clave-de-prueba' })).rejects.toBeInstanceOf(ConflictException);
    expect(usuario.create).not.toHaveBeenCalled();
  });
  it('selecciona solo datos públicos y firma el identificador', async () => {
    const { service, usuario, jwt } = fixture();
    const user = { id: 'user-id', nombre: 'Ana', email: 'ana@example.com', rol: 'BODEGUERO' };
    usuario.findUniqueOrThrow.mockResolvedValue(user);
    expect(await service.session(user.id)).toEqual({ accessToken: 'signed-token', user });
    expect(usuario.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: user.id }, select: publicUser });
    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.id });
  });
});
