import { Controller, Get } from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * HEALTH CHECK CONTROLLER
 *
 * Provides health check endpoint for monitoring
 * Used by load balancers, monitoring tools, etc.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health
   * Basic health check - returns system status
   */
  @Public()
  @Get()
  async check() {
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    let dbResponseTime = 0;

    // Check database connection
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }

    const totalResponseTime = Date.now() - startTime;

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        responseTime: `${dbResponseTime}ms`,
      },
      service: {
        name: 'MLM E-commerce API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      responseTime: `${totalResponseTime}ms`,
    };
  }

  /**
   * GET /health/ready
   * Readiness check - returns 200 if service is ready to accept traffic
   */
  @Public()
  @Get('ready')
  async readiness() {
    try {
      // Check critical dependencies
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * GET /health/live
   * Liveness check - returns 200 if service is alive
   */
  @Public()
  @Get('live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
