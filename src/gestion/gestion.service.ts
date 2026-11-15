import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service.js';
import { CategoriaDto, CategoriaUpdateDto, EquipoDto, EquipoUpdateDto, ListaQuery, MantenimientoDto, MovimientoDto, ProductoDto, ProductoUpdateDto } from './gestion.dto.js';

function pagination(q: ListaQuery) { return { skip: (q.page - 1) * q.limit, take: q.limit }; }
function page<T>(data: T[], total: number, q: ListaQuery) { return { data, meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) } }; }
const productoInclude = { categoria: true } as const;
const equipoInclude = { mantenimientos: { where: { estado: 'ABIERTO' as const }, select: { id: true } } } as const;
const movimientoInclude = { producto: true, mantenimiento: { include: { equipo: true } }, usuario: { select: { nombre: true } } } as const;

@Injectable()
export class GestionService {
  constructor(private readonly db: DatabaseService) {}
  async categorias(q: ListaQuery) {
    const where = { nombre: { contains: q.search ?? '', mode: 'insensitive' as const } };
    const [data, total] = await this.db.$transaction([
      this.db.categoria.findMany({ where, ...pagination(q), orderBy: { nombre: 'asc' }, include: { _count: { select: { productos: true } } } }), this.db.categoria.count({ where }),
    ]);
    return page(data, total, q);
  }
  categoria(id: string) { return this.db.categoria.findUniqueOrThrow({ where: { id } }); }
  crearCategoria(data: CategoriaDto) { return this.db.categoria.create({ data }); }
  editarCategoria(id: string, data: CategoriaUpdateDto) { return this.db.categoria.update({ where: { id }, data }); }
  eliminarCategoria(id: string) { return this.db.categoria.delete({ where: { id } }); }
  async productos(q: ListaQuery) {
    const where: Prisma.ProductoWhereInput = { categoriaId: q.categoriaId, OR: [{ nombre: { contains: q.search ?? '', mode: 'insensitive' } }, { codigo: { contains: q.search ?? '', mode: 'insensitive' } }] };
    const [data, total] = await this.db.$transaction([
      this.db.producto.findMany({ where, ...pagination(q), orderBy: { nombre: 'asc' }, include: productoInclude }), this.db.producto.count({ where }),
    ]);
    return page(data, total, q);
  }
  producto(id: string) { return this.db.producto.findUniqueOrThrow({ where: { id }, include: productoInclude }); }
  crearProducto(data: ProductoDto) { return this.db.producto.create({ data, include: productoInclude }); }
  editarProducto(id: string, data: ProductoUpdateDto) { return this.db.producto.update({ where: { id }, data, include: productoInclude }); }
  async eliminarProducto(id: string) {
    return this.db.$transaction(async tx => {
      const producto = await tx.producto.findUniqueOrThrow({ where: { id } });
      if (producto.stock !== 0) throw new ConflictException('No se puede eliminar un producto con stock.');
      return tx.producto.delete({ where: { id } });
    }, { isolationLevel: 'Serializable' });
  }
  async equipos(q: ListaQuery) {
    const where = { OR: [{ nombre: { contains: q.search ?? '', mode: 'insensitive' as const } }, { codigo: { contains: q.search ?? '', mode: 'insensitive' as const } }] };
    const [data, total] = await this.db.$transaction([this.db.equipo.findMany({ where, ...pagination(q), orderBy: { nombre: 'asc' }, include: equipoInclude }), this.db.equipo.count({ where })]);
    return page(data, total, q);
  }
  equipo(id: string) { return this.db.equipo.findUniqueOrThrow({ where: { id }, include: equipoInclude }); }
  crearEquipo(data: EquipoDto) { return this.db.equipo.create({ data, include: equipoInclude }); }
  editarEquipo(id: string, data: EquipoUpdateDto) { return this.db.equipo.update({ where: { id }, data, include: equipoInclude }); }
  eliminarEquipo(id: string) { return this.db.equipo.delete({ where: { id } }); }
  async mantenimientos(q: ListaQuery) {
    if (q.tipo && !['PREVENTIVO', 'CORRECTIVO'].includes(q.tipo)) throw new BadRequestException('Tipo de mantenimiento inválido.');
    const where: Prisma.MantenimientoWhereInput = { equipoId: q.equipoId, estado: q.estado, tipo: q.tipo as 'PREVENTIVO' | 'CORRECTIVO' | undefined, descripcion: { contains: q.search ?? '', mode: 'insensitive' } };
    const [data, total] = await this.db.$transaction([this.db.mantenimiento.findMany({ where, ...pagination(q), orderBy: [{ fecha: 'desc' }, { id: 'asc' }], include: { equipo: true } }), this.db.mantenimiento.count({ where })]);
    return page(data, total, q);
  }
  mantenimiento(id: string) { return this.db.mantenimiento.findUniqueOrThrow({ where: { id }, include: { equipo: true, movimientos: { include: { producto: true } } } }); }
  crearMantenimiento(data: MantenimientoDto) { return this.db.mantenimiento.create({ data, include: { equipo: true } }); }
  async cerrarMantenimiento(id: string) {
    return this.db.$transaction(async tx => {
      await tx.mantenimiento.findUniqueOrThrow({ where: { id } });
      const result = await tx.mantenimiento.updateMany({ where: { id, estado: 'ABIERTO' }, data: { estado: 'CERRADO', cerradoEn: new Date() } });
      if (!result.count) throw new ConflictException('La orden ya está cerrada.');
      return tx.mantenimiento.findUniqueOrThrow({ where: { id }, include: { equipo: true } });
    }, { isolationLevel: 'Serializable' });
  }
  async movimientos(q: ListaQuery) {
    if (q.tipo && !['ENTRADA', 'SALIDA'].includes(q.tipo)) throw new BadRequestException('Tipo de movimiento inválido.');
    const where: Prisma.MovimientoWhereInput = { productoId: q.productoId, mantenimientoId: q.mantenimientoId, tipo: q.tipo as 'ENTRADA' | 'SALIDA' | undefined, motivo: { contains: q.search ?? '', mode: 'insensitive' } };
    const [data, total] = await this.db.$transaction([this.db.movimiento.findMany({ where, ...pagination(q), orderBy: [{ fecha: 'desc' }, { id: 'asc' }], include: movimientoInclude }), this.db.movimiento.count({ where })]);
    return page(data, total, q);
  }
  movimiento(id: string) { return this.db.movimiento.findUniqueOrThrow({ where: { id }, include: movimientoInclude }); }
  async crearMovimiento(data: MovimientoDto, usuarioId: string) {
    if (data.mantenimientoId && data.tipo !== 'SALIDA') throw new BadRequestException('Solo las salidas pueden vincularse a un mantenimiento.');
    return this.db.$transaction(async tx => {
      if (data.mantenimientoId) {
        const orden = await tx.mantenimiento.findUniqueOrThrow({ where: { id: data.mantenimientoId } });
        if (orden.estado !== 'ABIERTO') throw new ConflictException('No se pueden consumir repuestos en una orden cerrada.');
      }
      await tx.producto.findUniqueOrThrow({ where: { id: data.productoId } });
      const salida = data.tipo === 'SALIDA';
      const changed = await tx.producto.updateMany({
        where: { id: data.productoId, stock: salida ? { gte: data.cantidad } : { lte: 2147483647 - data.cantidad } },
        data: { stock: { increment: salida ? -data.cantidad : data.cantidad } },
      });
      if (!changed.count) throw new ConflictException(salida ? 'Stock insuficiente para esta salida.' : 'El stock excede el límite permitido.');
      return tx.movimiento.create({ data: { productoId: data.productoId, tipo: data.tipo, cantidad: data.cantidad, motivo: data.motivo, mantenimientoId: data.mantenimientoId, usuarioId }, include: movimientoInclude });
    }, { isolationLevel: 'Serializable' });
  }
}
