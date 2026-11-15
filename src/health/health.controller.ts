import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/auth.guard.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('health')
@Public()
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @Get()
  async check() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'OK', db: 'ok', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'ERROR', db: 'unavailable' });
    }
  }
}
