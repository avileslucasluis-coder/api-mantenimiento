import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Admin } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth.guard.js';
import { GestionService } from './gestion.service.js';
import { CategoriaDto, CategoriaUpdateDto, EquipoDto, EquipoUpdateDto, ListaQuery, MantenimientoDto, MovimientoDto, ProductoDto, ProductoUpdateDto } from './gestion.dto.js';

@ApiTags('Gestión') @ApiBearerAuth() @Controller()
export class GestionController {
  constructor(private readonly service: GestionService) {}
  @Get('categorias') categorias(@Query() q: ListaQuery) { return this.service.categorias(q); }
  @Get('categorias/:id') categoria(@Param('id', ParseUUIDPipe) id: string) { return this.service.categoria(id); }
  @Admin() @Post('categorias') crearCategoria(@Body() dto: CategoriaDto) { return this.service.crearCategoria(dto); }
  @Admin() @Patch('categorias/:id') editarCategoria(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoriaUpdateDto) { return this.service.editarCategoria(id, dto); }
  @Admin() @Delete('categorias/:id') eliminarCategoria(@Param('id', ParseUUIDPipe) id: string) { return this.service.eliminarCategoria(id); }
  @Get('productos') productos(@Query() q: ListaQuery) { return this.service.productos(q); }
  @Get('productos/:id') producto(@Param('id', ParseUUIDPipe) id: string) { return this.service.producto(id); }
  @Admin() @Post('productos') crearProducto(@Body() dto: ProductoDto) { return this.service.crearProducto(dto); }
  @Admin() @Patch('productos/:id') editarProducto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductoUpdateDto) { return this.service.editarProducto(id, dto); }
  @Admin() @Delete('productos/:id') eliminarProducto(@Param('id', ParseUUIDPipe) id: string) { return this.service.eliminarProducto(id); }
  @Get('equipos') equipos(@Query() q: ListaQuery) { return this.service.equipos(q); }
  @Get('equipos/:id') equipo(@Param('id', ParseUUIDPipe) id: string) { return this.service.equipo(id); }
  @Admin() @Post('equipos') crearEquipo(@Body() dto: EquipoDto) { return this.service.crearEquipo(dto); }
  @Admin() @Patch('equipos/:id') editarEquipo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EquipoUpdateDto) { return this.service.editarEquipo(id, dto); }
  @Admin() @Delete('equipos/:id') eliminarEquipo(@Param('id', ParseUUIDPipe) id: string) { return this.service.eliminarEquipo(id); }
  @Get('mantenimientos') mantenimientos(@Query() q: ListaQuery) { return this.service.mantenimientos(q); }
  @Get('mantenimientos/:id') mantenimiento(@Param('id', ParseUUIDPipe) id: string) { return this.service.mantenimiento(id); }
  @Admin() @Post('mantenimientos') crearMantenimiento(@Body() dto: MantenimientoDto) { return this.service.crearMantenimiento(dto); }
  @Admin() @Patch('mantenimientos/:id/cerrar') cerrar(@Param('id', ParseUUIDPipe) id: string) { return this.service.cerrarMantenimiento(id); }
  @Get('movimientos') movimientos(@Query() q: ListaQuery) { return this.service.movimientos(q); }
  @Get('movimientos/:id') movimiento(@Param('id', ParseUUIDPipe) id: string) { return this.service.movimiento(id); }
  @Post('movimientos') crearMovimiento(@Body() dto: MovimientoDto, @Req() req: AuthRequest) { return this.service.crearMovimiento(dto, req.user.id); }
}
