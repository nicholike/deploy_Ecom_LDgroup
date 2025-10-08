/**
 * API related types
 */

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface AxiosError {
  response?: {
    data: any;
    status: number;
    statusText: string;
  };
  message: string;
}
