/**
 * ML Service Client
 * Provides timeout-protected calls to the ML service with proper error handling
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { config } from '../config/index.js';
import { logger } from './logger.js';
import { getFeatureFlags, setFeatureFlags } from './validateEnv.js';

// Default timeout for ML service calls (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// ML Service connection status
let mlServiceHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

export interface MLServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Get ML service base URL
 */
function getMLServiceUrl(): string {
  return config.mlService.url || 'http://localhost:8000';
}

/**
 * Check ML service health
 */
export async function checkMLHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Skip if recently checked
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && mlServiceHealthy) {
    return mlServiceHealthy;
  }
  
  try {
    const response = await axios.get(`${getMLServiceUrl()}/health`, {
      timeout: 5000,
    });
    mlServiceHealthy = response.status === 200;
    lastHealthCheck = now;
    return mlServiceHealthy;
  } catch {
    mlServiceHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Call ML service with timeout and error handling
 */
export async function callMLService<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: Record<string, unknown>,
  timeout: number = DEFAULT_TIMEOUT
): Promise<MLServiceResponse<T>> {
  const url = `${getMLServiceUrl()}${endpoint}`;
  
  try {
    let response: AxiosResponse<T>;
    
    if (method === 'GET') {
      response = await axios.get<T>(url, {
        timeout,
        params: data,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      response = await axios.post<T>(url, data, {
        timeout,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Update health status on success
    mlServiceHealthy = true;
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Log the error
    logger.error('ML Service call failed:', {
      endpoint,
      method,
      errorCode: axiosError.code,
      message: axiosError.message,
    });
    
    // Determine error type
    if (axiosError.code === 'ECONNREFUSED') {
      mlServiceHealthy = false;
      return {
        success: false,
        error: {
          code: 'ML_SERVICE_UNAVAILABLE',
          message: 'ML service is not reachable',
        },
      };
    }
    
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: {
          code: 'ML_SERVICE_TIMEOUT',
          message: `ML service request timed out after ${timeout}ms`,
        },
      };
    }
    
    // Server returned an error
    if (axiosError.response) {
      const status = axiosError.response.status;
      const responseData = axiosError.response.data as Record<string, unknown>;
      
      return {
        success: false,
        error: {
          code: `ML_SERVICE_ERROR_${status}`,
          message: (responseData?.message as string) || `ML service returned ${status}`,
        },
      };
    }
    
    // Unknown error
    return {
      success: false,
      error: {
        code: 'ML_SERVICE_ERROR',
        message: axiosError.message || 'Unknown ML service error',
      },
    };
  }
}

/**
 * Forecast endpoint helpers
 */
export async function getForecast(
  userId: string,
  days: number = 30
): Promise<MLServiceResponse<unknown>> {
  return callMLService('/forecast/balance', 'POST', {
    user_id: userId,
    days,
  });
}

/**
 * Anomaly detection helpers
 */
export async function detectAnomalies(
  userId: string,
  transactions: Array<{ amount: number; date: string; category: string }>
): Promise<MLServiceResponse<unknown>> {
  return callMLService('/anomaly/detect', 'POST', {
    user_id: userId,
    transactions,
  });
}

/**
 * Category prediction helpers
 */
export async function predictCategory(
  description: string,
  amount: number
): Promise<MLServiceResponse<{ category: string; confidence: number }>> {
  return callMLService('/category/predict', 'POST', {
    description,
    amount,
  });
}

/**
 * Financial health score helpers
 */
export async function getHealthScore(
  userId: string,
  metrics: Record<string, unknown>
): Promise<MLServiceResponse<unknown>> {
  return callMLService(`/health/${userId}`, 'POST', metrics);
}

/**
 * Insights helpers
 */
export async function getInsights(
  userId: string,
  insightTypes: string[] = ['spending', 'savings', 'goals']
): Promise<MLServiceResponse<unknown>> {
  return callMLService('/insights/generate', 'POST', {
    user_id: userId,
    insight_types: insightTypes,
  });
}

/**
 * OCR helpers
 */
export async function scanReceipt(
  imageBuffer: Buffer,
  filename: string
): Promise<MLServiceResponse<unknown>> {
  // For OCR, we need to use multipart/form-data
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  formData.append('file', imageBuffer, { filename });
  
  try {
    const response = await axios.post(
      `${getMLServiceUrl()}/ocr/scan-receipt`,
      formData,
      {
        timeout: DEFAULT_TIMEOUT,
        headers: formData.getHeaders(),
      }
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('OCR scan failed:', { message: axiosError.message });
    
    return {
      success: false,
      error: {
        code: 'OCR_ERROR',
        message: 'Failed to scan receipt',
      },
    };
  }
}

/**
 * Check if ML service is available
 */
export function isMLServiceHealthy(): boolean {
  return mlServiceHealthy;
}
