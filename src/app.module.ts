import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseService } from './database/database.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { GestionController } from './gestion/gestion.controller.js';
import { GestionService } from './gestion/gestion.service.js';

@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h', algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } }) }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
  controllers: [HealthController, AuthController, GestionController],
  providers: [DatabaseService, AuthService, GestionService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
