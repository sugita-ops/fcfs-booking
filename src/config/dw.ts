/**
 * DandoriWork Integration Configuration
 * ダンドリワーク連携設定
 */

export interface DandoriWorkConfig {
  baseUrl: string;
  authMethod: 'bearer' | 'hmac';
  bearerToken?: string;
  hmacSecret?: string;
  timeout: number;
  maxRetries: number;
  retryDelays: number[]; // seconds
  enableCompression: boolean;
  userAgent: string;
}

// Default configuration
export const defaultDwConfig: DandoriWorkConfig = {
  baseUrl: process.env.DANDORI_API_BASE_URL || 'https://api.dandoli.jp/api',
  authMethod: 'bearer',
  bearerToken: process.env.DANDORI_BEARER_TOKEN,
  hmacSecret: process.env.HMAC_SECRET,
  timeout: parseInt(process.env.DW_TIMEOUT || '30000'), // 30 seconds
  maxRetries: parseInt(process.env.DW_MAX_RETRIES || '3'),
  retryDelays: [1, 5, 15], // 1s, 5s, 15s
  enableCompression: true,
  userAgent: 'fcfs-booking/1.0'
};

// Error classification for retry logic
export enum DandoriErrorType {
  CLIENT_ERROR = 'client_error',    // 4xx - do not retry
  SERVER_ERROR = 'server_error',    // 5xx - retry
  TIMEOUT = 'timeout',              // timeout - retry
  NETWORK_ERROR = 'network_error',  // network - retry
  UNKNOWN = 'unknown'               // unknown - retry
}

export interface DandoriApiError {
  type: DandoriErrorType;
  httpStatus?: number;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Classify error for retry decision
 */
export function classifyDandoriError(error: any): DandoriApiError {
  // HTTP status code based classification
  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;

    if (status >= 400 && status < 500) {
      return {
        type: DandoriErrorType.CLIENT_ERROR,
        httpStatus: status,
        message: error.message || `HTTP ${status} error`,
        originalError: error,
        retryable: false
      };
    }

    if (status >= 500) {
      return {
        type: DandoriErrorType.SERVER_ERROR,
        httpStatus: status,
        message: error.message || `HTTP ${status} error`,
        originalError: error,
        retryable: true
      };
    }
  }

  // Timeout errors
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return {
      type: DandoriErrorType.TIMEOUT,
      message: 'Request timeout',
      originalError: error,
      retryable: true
    };
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
    return {
      type: DandoriErrorType.NETWORK_ERROR,
      message: `Network error: ${error.code}`,
      originalError: error,
      retryable: true
    };
  }

  // Default to unknown retryable error
  return {
    type: DandoriErrorType.UNKNOWN,
    message: error.message || 'Unknown error',
    originalError: error,
    retryable: true
  };
}