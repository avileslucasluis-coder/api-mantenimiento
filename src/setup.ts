import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { PrismaFilter } from './common/prisma.filter.js';

export function setup(app: INestApplication) {
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(s => s.trim()), credentials: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new PrismaFilter());
  const config = new DocumentBuilder().setTitle('Gestión de mantenimiento e inventarios').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  app.enableShutdownHooks();
}
