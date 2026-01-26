import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse, ApiError } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Create axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );

            if (response.data.success && response.data.data) {
              localStorage.setItem('accessToken', response.data.data.accessToken);
              localStorage.setItem('refreshToken', response.data.data.refreshToken);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
              }

              return instance(originalRequest);
            }
          }
        } catch (refreshError) {
          // Refresh failed - logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

const apiClient = createApiClient();

/**
 * Handle API errors and extract error message
 */
const handleError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    return {
      code: 'NETWORK_ERROR',
      message: axiosError.message || 'An unexpected error occurred',
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
};

/**
 * Generic API request handler
 */
async function request<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    let response: AxiosResponse<ApiResponse<T>>;

    switch (method) {
      case 'get':
        response = await apiClient.get(url, config);
        break;
      case 'post':
        response = await apiClient.post(url, data, config);
        break;
      case 'put':
        response = await apiClient.put(url, data, config);
        break;
      case 'patch':
        response = await apiClient.patch(url, data, config);
        break;
      case 'delete':
        response = await apiClient.delete(url, config);
        break;
    }

    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Request failed');
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * API Service with typed methods
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>('get', url, undefined, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('post', url, data, config),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('put', url, data, config),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('patch', url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => request<T>('delete', url, undefined, config),
};

/**
 * Upload file with progress tracking
 */
export const uploadFile = async <T>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<T>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.error?.message || 'Upload failed');
};

/**
 * Download file
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  const response = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export default api;
