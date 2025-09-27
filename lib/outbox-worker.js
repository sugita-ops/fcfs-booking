#!/usr/bin/env node

/**
 * Outbox Worker - Reliable Message Delivery
 * Processes pending outbox events and delivers them to external services
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
const { createHmac } = require('crypto');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE) || 10,
  pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL) || 5000,
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES) || 5,
  webhookUrl: process.env.DW_WEBHOOK_URL || 'http://localhost:3001/webhook/test',
  hmacSecret: process.env.HMAC_SECRET || 'test-hmac-secret',
  workerName: process.env.WORKER_NAME || `worker-${process.pid}`,
  timeout: parseInt(process.env.HTTP_TIMEOUT) || 10000,
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fcfs_booking',
  max: 5,
  idleTimeoutMillis: 30000,
});

// Metrics
const metrics = {
  processed: 0,
  succeeded: 0,
  failed: 0,
  retried: 0,
  startTime: Date.now(),
};

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(body, secret, timestamp) {
  const message = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Calculate next retry delay using exponential backoff
 * Delays: 1m, 5m, 15m, 1h, 6h
 */
function calculateRetryDelay(retryCount) {
  const delays = [60, 300, 900, 3600, 21600]; // seconds
  const delaySeconds = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delaySeconds * 1000);
}

/**
 * Send webhook with HMAC signature
 */
async function sendWebhook(event) {
  const startTime = performance.now();
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(event.payload);
  const signature = generateSignature(body, config.hmacSecret, timestamp);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp.toString(),
        'X-Event-Id': event.event_id,
        'X-Event-Name': event.event_name,
        'User-Agent': `fcfs-booking-outbox/${config.workerName}`,
      },
      body,
      timeout: config.timeout,
    });

    const duration = Math.round(performance.now() - startTime);
    const responseText = await response.text();

    if (response.ok) {
      console.log(`✅ Event ${event.event_id} sent successfully (${duration}ms, ${response.status})`);
      return { success: true, status: response.status, duration };
    } else {
      console.error(`❌ Event ${event.event_id} failed: HTTP ${response.status} (${duration}ms)`);
      console.error(`   Response: ${responseText.substring(0, 200)}`);
      return { success: false, status: response.status, error: responseText, duration };
    }

  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error(`❌ Event ${event.event_id} failed: ${error.message} (${duration}ms)`);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Process a single outbox event
 */
async function processEvent(client, event) {
  console.log(`🚀 Processing event ${event.event_id} (attempt ${event.retry_count + 1}/${config.maxRetries + 1})`);

  const result = await sendWebhook(event);
  metrics.processed++;

  if (result.success) {
    // Mark as sent
    await client.query(`
      UPDATE integration_outbox
      SET status = 'sent', updated_at = now()
      WHERE id = $1
    `, [event.id]);

    metrics.succeeded++;
    console.log(`📤 Event ${event.event_id} marked as sent`);

  } else {
    // Handle failure
    const newRetryCount = event.retry_count + 1;

    if (newRetryCount > config.maxRetries) {
      // Mark as failed (dead letter)
      await client.query(`
        UPDATE integration_outbox
        SET status = 'failed', retry_count = $1, updated_at = now()
        WHERE id = $2
      `, [newRetryCount, event.id]);

      metrics.failed++;
      console.log(`💀 Event ${event.event_id} marked as failed (max retries exceeded)`);

    } else {
      // Schedule retry with exponential backoff
      const nextAttempt = calculateRetryDelay(newRetryCount);

      await client.query(`
        UPDATE integration_outbox
        SET retry_count = $1, next_attempt_at = $2, updated_at = now()
        WHERE id = $3
      `, [newRetryCount, nextAttempt, event.id]);

      metrics.retried++;
      console.log(`🔄 Event ${event.event_id} scheduled for retry at ${nextAttempt.toISOString()}`);
    }
  }

  return result;
}

/**
 * Fetch pending events from outbox
 */
async function fetchPendingEvents(client) {
  const result = await client.query(`
    SELECT
      id,
      event_id,
      event_name,
      payload,
      target,
      retry_count,
      next_attempt_at,
      created_at
    FROM integration_outbox
    WHERE
      status IN ('pending', 'failed')
      AND now() >= next_attempt_at
    ORDER BY
      created_at ASC
    LIMIT $1
  `, [config.batchSize]);

  return result.rows;
}

/**
 * Process one batch of events
 */
async function processBatch() {
  const client = await pool.connect();

  try {
    const events = await fetchPendingEvents(client);

    if (events.length === 0) {
      return { processed: 0 };
    }

    console.log(`📋 Processing batch of ${events.length} events`);

    const results = [];
    for (const event of events) {
      try {
        const result = await processEvent(client, event);
        results.push({ event_id: event.event_id, ...result });
      } catch (error) {
        console.error(`❌ Failed to process event ${event.event_id}:`, error.message);
        results.push({ event_id: event.event_id, success: false, error: error.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Batch complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      processed: events.length,
      succeeded,
      failed,
      results
    };

  } finally {
    client.release();
  }
}

/**
 * Print worker metrics
 */
function printMetrics() {
  const uptime = Math.round((Date.now() - metrics.startTime) / 1000);
  const rate = uptime > 0 ? (metrics.processed / uptime).toFixed(2) : '0.00';

  console.log(`\n📊 Worker Metrics (${config.workerName}):`);
  console.log(`   Uptime: ${uptime}s`);
  console.log(`   Processed: ${metrics.processed} (${rate}/s)`);
  console.log(`   Succeeded: ${metrics.succeeded}`);
  console.log(`   Retried: ${metrics.retried}`);
  console.log(`   Failed: ${metrics.failed}`);
  console.log(`   Webhook URL: ${config.webhookUrl}`);
  console.log('');
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log(`🚀 Starting Outbox Worker (${config.workerName})`);
  console.log(`📋 Configuration:`);
  console.log(`   Batch size: ${config.batchSize}`);
  console.log(`   Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`   Max retries: ${config.maxRetries}`);
  console.log(`   Webhook URL: ${config.webhookUrl}`);
  console.log(`   HMAC Secret: ${config.hmacSecret ? '***' : 'NOT SET'}`);
  console.log('');

  // Setup graceful shutdown
  let running = true;
  process.on('SIGINT', () => {
    console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
    running = false;
  });

  process.on('SIGTERM', () => {
    console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
    running = false;
  });

  // Print metrics every 60 seconds
  const metricsInterval = setInterval(printMetrics, 60000);

  // Main processing loop
  while (running) {
    try {
      await processBatch();
    } catch (error) {
      console.error('❌ Batch processing error:', error.message);
    }

    if (running) {
      await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
    }
  }

  clearInterval(metricsInterval);
  printMetrics();

  console.log('👋 Worker shutdown complete');
  await pool.end();
  process.exit(0);
}

/**
 * Test webhook endpoint availability
 */
async function testWebhook() {
  console.log(`🧪 Testing webhook endpoint: ${config.webhookUrl}`);

  const testPayload = {
    event: 'test.connection',
    version: '1.0',
    id: `test_${Date.now()}`,
    occurred_at: new Date().toISOString(),
    producer: 'fcfs-booking-test',
    data: { message: 'Connection test from outbox worker' }
  };

  try {
    const result = await sendWebhook({
      event_id: testPayload.id,
      event_name: 'test.connection',
      payload: testPayload
    });

    if (result.success) {
      console.log('✅ Webhook endpoint is reachable');
    } else {
      console.log('⚠️  Webhook endpoint returned error, but worker will continue');
    }
  } catch (error) {
    console.log('⚠️  Webhook endpoint test failed, but worker will continue');
  }

  console.log('');
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'test') {
    testWebhook().then(() => process.exit(0));
  } else {
    runWorker().catch(error => {
      console.error('💥 Worker crashed:', error);
      process.exit(1);
    });
  }
}

module.exports = {
  runWorker,
  processBatch,
  sendWebhook,
  generateSignature,
  calculateRetryDelay,
};