import { describe, it, expect, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { DatabaseService } from '../database/database.service.js';

describe('HealthController', () => {
  it('confirma disponibilidad después de consultar PostgreSQL', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController({ $queryRaw: query } as unknown as DatabaseService);
    expect(await controller.check()).toMatchObject({ status: 'OK', db: 'ok' });
    expect(query).toHaveBeenCalledOnce();
  });
  it('responde 503 sin revelar detalles de conexión si PostgreSQL falla', async () => {
    const controller = new HealthController({
      $queryRaw: vi.fn().mockRejectedValue(new Error('detalle interno de conexión')),
    } as unknown as DatabaseService);
    try {
      await controller.check();
      expect.fail('Se esperaba un error de disponibilidad');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = error as ServiceUnavailableException;
      expect(response.getStatus()).toBe(503);
      expect(JSON.stringify(response.getResponse())).not.toContain('detalle interno');
    }
  });
});
