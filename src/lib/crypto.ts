import { createHmac, timingSafeEqual } from 'crypto';

/**
 * HMAC signature utilities for secure API communication
 */

export interface SignatureResult {
  signature: string;
  timestamp: number;
}

/**
 * Generate HMAC-SHA256 signature for message body
 * @param body - Message body (string or object)
 * @param secret - HMAC secret key
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Signature string in format "sha256=<hex>"
 */
export function sign(
  body: string | object,
  secret: string,
  timestamp?: number
): string {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const ts = timestamp || Math.floor(Date.now() / 1000);

  // Include timestamp in signature to prevent replay attacks
  const message = `${ts}.${payload}`;

  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  const signature = hmac.digest('hex');

  return `sha256=${signature}`;
}

/**
 * Generate signature with timestamp for webhook delivery
 * @param body - Message body
 * @param secret - HMAC secret key
 * @returns Object with signature and timestamp
 */
export function signWithTimestamp(
  body: string | object,
  secret: string
): SignatureResult {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(body, secret, timestamp);

  return { signature, timestamp };
}

/**
 * Verify HMAC signature
 * @param signature - Received signature in format "sha256=<hex>"
 * @param body - Message body to verify
 * @param secret - HMAC secret key
 * @param timestamp - Message timestamp (for replay attack prevention)
 * @param toleranceSeconds - Maximum age tolerance (default: 300 seconds)
 * @returns True if signature is valid and within tolerance
 */
export function verify(
  signature: string,
  body: string | object,
  secret: string,
  timestamp?: number,
  toleranceSeconds: number = 300
): boolean {
  try {
    // Extract algorithm and hash from signature
    const parts = signature.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      return false;
    }

    const receivedHash = parts[1];

    // If timestamp provided, check for replay attack
    if (timestamp !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false; // Message too old or from future
      }
    }

    // Generate expected signature
    const expectedSignature = sign(body, secret, timestamp);
    const expectedHash = expectedSignature.split('=')[1];

    // Use timing-safe comparison to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);

  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate event ID for outbox events
 * @param prefix - Event prefix (e.g., 'claim', 'cancel')
 * @param entityId - Related entity ID
 * @returns Unique event ID
 */
export function generateEventId(prefix: string, entityId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${entityId.substring(0, 8)}_${timestamp}_${random}`;
}

/**
 * Create payload for claim.confirmed event
 * @param data - Claim data
 * @returns Formatted payload for DandoriWork
 */
export function createClaimConfirmedPayload(data: {
  claim_id: string;
  slot_id: string;
  company_id: string;
  user_id: string | null;
  work_date: string;
  claimed_at: string;
  tenant_id: string;
  dw_project_id?: string;
  job_post_id: string;
}): object {
  return {
    event: 'claim.confirmed',
    version: '1.0',
    id: generateEventId('claim', data.claim_id),
    occurred_at: data.claimed_at,
    producer: 'fcfs-booking',
    data: {
      dw_project_id: data.dw_project_id || null,
      job_post: {
        id: data.job_post_id,
        work_date: data.work_date
      },
      slot: {
        slot_id: data.slot_id,
        status: 'claimed'
      },
      claim: {
        claim_id: data.claim_id,
        company_id: data.company_id,
        user_id: data.user_id,
        claimed_at: data.claimed_at
      },
      tenant_id: data.tenant_id
    }
  };
}