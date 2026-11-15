import 'dotenv/config';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

let server: ChildProcess;
let base: string;

beforeAll(async () => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('Puerto no disponible');
  const port = address.port;
  await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, PORT: String(port) }, stdio: 'ignore', windowsHide: true,
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('La API de pruebas no pudo arrancar');
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch { /* Esperar a que el servidor abra el puerto. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('La API no estuvo disponible en 10 segundos');
}, 15000);

afterAll(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
});

function post(path: string, body: object) {
  return fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('API real con configuración de producción', () => {
  it('health comprueba PostgreSQL sin exigir sesión', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'OK', db: 'ok' });
  });
  it('productos requiere autenticación', async () => {
    expect((await fetch(`${base}/productos`)).status).toBe(401);
  });
  it('categorías requiere autenticación', async () => {
    expect((await fetch(`${base}/categorias`)).status).toBe(401);
  });
  it('movimientos rechaza un token inválido', async () => {
    expect((await fetch(`${base}/movimientos`, { headers: { Authorization: 'Bearer invalido' } })).status).toBe(401);
  });
  it('login valida campos obligatorios', async () => {
    expect((await post('auth/login', {})).status).toBe(400);
  });
  it('login rechaza credenciales desconocidas', async () => {
    expect((await post('auth/login', { email: 'inexistente-e2e@example.invalid', password: 'incorrecta-e2e' })).status).toBe(401);
  });
  it('registro no permite inyectar el rol ADMIN', async () => {
    expect((await post('auth/register', { nombre: 'Prueba', email: 'no-crear@example.invalid', password: 'clave-de-prueba', rol: 'ADMIN' })).status).toBe(400);
  });
  it('envía las cabeceras de seguridad de la configuración compartida', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});
