import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      message: 'Bachelor Hub API is up and running 🏠',
      result: {
        name: 'Bachelor Hub API',
        description:
          'Backend for Bachelor Hub — meal, bazar and shared-expense management for bachelor messes in Bangladesh.',
        version: '1.0.0',
        status: 'ok',
        documentation: '/api-docs',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
