import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'pass' | 'fail';
      responseTime?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp,
    checks: {
      database: {
        status: 'pass',
      },
    },
  };

  try {
    // Simple database connectivity check
    const dbStart = Date.now();
    const result = await pool.query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - dbStart;

    if (result.rows[0]?.health_check === 1) {
      healthStatus.checks.database = {
        status: 'pass',
        responseTime: dbResponseTime,
      };
    } else {
      throw new Error('Unexpected database response');
    }
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.checks.database = {
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}