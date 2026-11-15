import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.guard.js';

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }
}
