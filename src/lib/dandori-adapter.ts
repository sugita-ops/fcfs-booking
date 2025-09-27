/**
 * DandoriWork Integration Adapter
 * ダンドリワーク連携アダプター
 */

import { sign, verify } from '@/lib/crypto';
import { defaultDwConfig, DandoriWorkConfig, classifyDandoriError, DandoriApiError } from '@/config/dw';

// API Response Types
export interface DwProject {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'completed';
  client_company: string;
  start_date: string;
  end_date?: string;
  location?: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface DwCompany {
  id: string;
  name: string;
  trade: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
}

export interface DwClaimNotification {
  claim_id: string;
  slot_id: string;
  company_id: string;
  user_id?: string;
  work_date: string;
  claimed_at: string;
  project_id?: string;
  job_post_id: string;
}

// Adapter Interface
export interface IDandoriAdapter {
  getProject(dw_project_id: string): Promise<DwProject>;
  getCompany(dw_company_id: string): Promise<DwCompany>;
  notifyClaimConfirmed(payload: DwClaimNotification): Promise<void>;
}

// Main Adapter Implementation
export class DandoriAdapter implements IDandoriAdapter {
  private config: DandoriWorkConfig;

  constructor(config?: Partial<DandoriWorkConfig>) {
    this.config = { ...defaultDwConfig, ...config };
  }

  /**
   * Get project information from DandoriWork
   */
  async getProject(dw_project_id: string): Promise<DwProject> {
    // Stub implementation - replace with actual API call
    console.log(`[DandoriAdapter] getProject called with ID: ${dw_project_id}`);

    // Simulate API response
    return {
      id: dw_project_id,
      name: `プロジェクト ${dw_project_id}`,
      status: 'active',
      client_company: 'サンプル建設株式会社',
      start_date: '2024-01-15',
      end_date: '2024-03-31',
      location: {
        address: '東京都新宿区西新宿1-1-1',
        latitude: 35.6895,
        longitude: 139.6917
      }
    };

    // TODO: Implement actual API call
    /*
    try {
      const response = await this.makeApiRequest(
        'GET',
        `/projects/${dw_project_id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getProject');
    }
    */
  }

  /**
   * Get company information from DandoriWork
   */
  async getCompany(dw_company_id: string): Promise<DwCompany> {
    // Stub implementation - replace with actual API call
    console.log(`[DandoriAdapter] getCompany called with ID: ${dw_company_id}`);

    // Simulate API response
    return {
      id: dw_company_id,
      name: `会社 ${dw_company_id}`,
      trade: '基礎工',
      contact_email: 'contact@example.com',
      contact_phone: '03-1234-5678',
      is_active: true
    };

    // TODO: Implement actual API call
    /*
    try {
      const response = await this.makeApiRequest(
        'GET',
        `/companies/${dw_company_id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getCompany');
    }
    */
  }

  /**
   * Notify DandoriWork of confirmed claim
   */
  async notifyClaimConfirmed(payload: DwClaimNotification): Promise<void> {
    // Stub implementation - replace with actual API call
    console.log(`[DandoriAdapter] notifyClaimConfirmed called:`, payload);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate success (no exceptions thrown)
    console.log(`[DandoriAdapter] Claim notification sent successfully for claim ${payload.claim_id}`);

    // TODO: Implement actual API call
    /*
    try {
      await this.makeApiRequest(
        'POST',
        '/notifications/claim-confirmed',
        payload
      );
    } catch (error) {
      throw this.handleApiError(error, 'notifyClaimConfirmed');
    }
    */
  }

  /**
   * Make authenticated API request to DandoriWork
   */
  private async makeApiRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent
    };

    // Add authentication
    if (this.config.authMethod === 'bearer' && this.config.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
    } else if (this.config.authMethod === 'hmac' && this.config.hmacSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = data ? JSON.stringify(data) : '';
      const signature = sign(body, this.config.hmacSecret, timestamp);

      headers['X-Signature'] = signature;
      headers['X-Timestamp'] = timestamp.toString();
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }

      throw error;
    }
  }

  /**
   * Handle and classify API errors
   */
  private handleApiError(error: any, operation: string): DandoriApiError {
    const classified = classifyDandoriError(error);

    console.error(`[DandoriAdapter] ${operation} failed:`, {
      type: classified.type,
      httpStatus: classified.httpStatus,
      message: classified.message,
      retryable: classified.retryable
    });

    return classified;
  }
}

// Factory function for creating adapter instances
export function createDandoriAdapter(config?: Partial<DandoriWorkConfig>): IDandoriAdapter {
  return new DandoriAdapter(config);
}

// Default singleton instance
export const dandoriAdapter = createDandoriAdapter();