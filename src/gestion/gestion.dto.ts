import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CategoriaDto {
  @Transform(trim) @IsString() @Length(2, 100) nombre: string;
  @IsOptional() @IsString() @Length(0, 1000) descripcion?: string;
}
export class CategoriaUpdateDto extends PartialType(CategoriaDto) {}
export class ProductoDto extends CategoriaDto {
  @Transform(trim) @IsString() @Length(2, 50) codigo: string;
  @IsUUID() categoriaId: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999) precio: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) stockMinimo?: number;
  @IsOptional() @IsString() @Length(1, 30) unidad?: string;
}
export class ProductoUpdateDto extends PartialType(ProductoDto) {}
export class EquipoDto extends CategoriaDto {
  @Transform(trim) @IsString() @Length(2, 50) codigo: string;
  @Transform(trim) @IsString() @Length(2, 150) ubicacion: string;
}
export class EquipoUpdateDto extends PartialType(EquipoDto) {}
export class MantenimientoDto {
  @IsUUID() equipoId: string;
  @IsEnum({ PREVENTIVO: 'PREVENTIVO', CORRECTIVO: 'CORRECTIVO' }) tipo: 'PREVENTIVO' | 'CORRECTIVO';
  @Transform(trim) @IsString() @Length(3, 1000) descripcion: string;
}
export class MovimientoDto {
  @IsUUID() productoId: string;
  @IsEnum({ ENTRADA: 'ENTRADA', SALIDA: 'SALIDA' }) tipo: 'ENTRADA' | 'SALIDA';
  @IsInt() @Min(1) @Max(1000000) cantidad: number;
  @IsOptional() @IsString() @Length(0, 1000) motivo?: string;
  @IsOptional() @IsUUID() mantenimientoId?: string;
}
export class ListaQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @Length(0, 100) search?: string;
  @IsOptional() @IsUUID() categoriaId?: string;
  @IsOptional() @IsUUID() productoId?: string;
  @IsOptional() @IsUUID() equipoId?: string;
  @IsOptional() @IsUUID() mantenimientoId?: string;
  @IsOptional() @IsEnum({ ENTRADA: 'ENTRADA', SALIDA: 'SALIDA', PREVENTIVO: 'PREVENTIVO', CORRECTIVO: 'CORRECTIVO' }) tipo?: string;
  @IsOptional() @IsEnum({ ABIERTO: 'ABIERTO', CERRADO: 'CERRADO' }) estado?: 'ABIERTO' | 'CERRADO';
}
