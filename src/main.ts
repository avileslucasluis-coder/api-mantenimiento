import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setup } from './setup.js';

async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Configura DATABASE_URL y JWT_SECRET (mínimo 32 caracteres).');
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 10) throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
  const app = await NestFactory.create(AppModule);
  setup(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
