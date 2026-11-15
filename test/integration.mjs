import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL || 'http://localhost:3000';
const suffix = randomUUID().slice(0, 8);
let admin, bodeguero, categoria, producto, equipo, orden;
async function call(method, path, body, token, status = 200) {
  const response = await fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert.equal(response.status, status, JSON.stringify(json));
  return json;
}
await test('health y rutas protegidas', async () => {
  assert.equal((await call('GET', 'health')).status, 'OK');
  await call('GET', 'productos', null, null, 401);
});
await test('login administrador y registro sin escalamiento de rol', async () => {
  admin = (await call('POST', 'auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).accessToken;
  const result = await call('POST', 'auth/register', { nombre: 'Prueba integración', email: `test-${suffix}@example.com`, password: randomUUID() }, null, 201);
  assert.equal(result.user.rol, 'BODEGUERO'); bodeguero = result.accessToken;
  await call('POST', 'categorias', { nombre: `No autorizado ${suffix}` }, bodeguero, 403);
});
await test('CRUD y validación de stock no editable', async () => {
  categoria = await call('POST', 'categorias', { nombre: `Repuestos ${suffix}` }, admin, 201);
  producto = await call('POST', 'productos', { nombre: 'Rodamiento', codigo: `ROD-${suffix}`, categoriaId: categoria.id, precio: 12.5 }, admin, 201);
  await call('PATCH', `productos/${producto.id}`, { stock: 99 }, admin, 400);
  await call('DELETE', `categorias/${categoria.id}`, null, admin, 409);
  const page = await call('GET', `productos?categoriaId=${categoria.id}`, null, bodeguero);
  assert.equal(page.meta.total, 1);
});
await test('equipos y apertura de mantenimiento', async () => {
  equipo = await call('POST', 'equipos', { nombre: 'Compresor', codigo: `EQ-${suffix}`, ubicacion: 'Taller' }, admin, 201);
  orden = await call('POST', 'mantenimientos', { equipoId: equipo.id, tipo: 'PREVENTIVO', descripcion: 'Cambio de rodamiento' }, admin, 201);
  assert.equal((await call('GET', `equipos/${equipo.id}`, null, admin)).mantenimientos.length, 1);
});
await test('entrada y consumo vinculado actualizan stock', async () => {
  await call('POST', 'movimientos', { productoId: producto.id, tipo: 'ENTRADA', cantidad: 10 }, bodeguero, 201);
  await call('POST', 'movimientos', { productoId: producto.id, tipo: 'SALIDA', cantidad: 3, mantenimientoId: orden.id }, bodeguero, 201);
  assert.equal((await call('GET', `productos/${producto.id}`, null, admin)).stock, 7);
});
await test('salida excesiva no altera stock ni historial', async () => {
  await call('POST', 'movimientos', { productoId: producto.id, tipo: 'SALIDA', cantidad: 8 }, bodeguero, 409);
  assert.equal((await call('GET', `productos/${producto.id}`, null, admin)).stock, 7);
  assert.equal((await call('GET', `movimientos?productoId=${producto.id}`, null, admin)).meta.total, 2);
});
await test('concurrencia no permite stock negativo', async () => {
  const results = await Promise.all([1, 2].map(() => fetch(`${base}/movimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bodeguero}` }, body: JSON.stringify({ productoId: producto.id, tipo: 'SALIDA', cantidad: 5 }) })));
  assert.deepEqual(results.map(r => r.status).sort((a, b) => a - b), [201, 409]);
  assert.equal((await call('GET', `productos/${producto.id}`, null, admin)).stock, 2);
});
await test('cierre impide nuevos consumos y libera equipo', async () => {
  await call('PATCH', `mantenimientos/${orden.id}/cerrar`, null, bodeguero, 403);
  await call('PATCH', `mantenimientos/${orden.id}/cerrar`, null, admin);
  await call('POST', 'movimientos', { productoId: producto.id, tipo: 'SALIDA', cantidad: 1, mantenimientoId: orden.id }, bodeguero, 409);
  assert.equal((await call('GET', `equipos/${equipo.id}`, null, admin)).mantenimientos.length, 0);
  await call('PATCH', `movimientos/${randomUUID()}`, {}, admin, 404);
});

