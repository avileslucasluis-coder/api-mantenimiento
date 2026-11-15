import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const status = error.code === 'P2025' ? 404 : ['P2002', 'P2003', 'P2034'].includes(error.code) ? 409 : 500;
    const message = error.code === 'P2002' ? 'Ya existe un registro con ese código o nombre.'
      : error.code === 'P2003' ? 'El registro está relacionado con otros datos o la referencia no existe.'
      : error.code === 'P2025' ? 'No se encontró el registro.'
      : error.code === 'P2034' ? 'Otro usuario modificó los datos. Vuelve a intentarlo.'
      : 'No se pudo completar la operación.';
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message });
  }
}
