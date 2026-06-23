import type {
  IApiClient,
  ApiResponse,
  RequestConfig,
  ErrorInterceptor,
  RequestInterceptor,
  ResponseInterceptor,
} from './types';
import { ApiError as ApiErrorClass } from './types';

const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_RETRY_DELAY = 1_000;

export class ApiClient implements IApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private errorInterceptors: ErrorInterceptor[] = [];
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor);
      if (idx >= 0) this.requestInterceptors.splice(idx, 1);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor);
      if (idx >= 0) this.responseInterceptors.splice(idx, 1);
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor);
      if (idx >= 0) this.errorInterceptors.splice(idx, 1);
    };
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  private async request<T>(path: string, config: RequestConfig): Promise<T> {
    let finalConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(path, finalConfig);
    }

    const retries = finalConfig.retries ?? DEFAULT_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.executeRequest<T>(path, finalConfig);
        let result = response;
        for (const interceptor of this.responseInterceptors) {
          result = await interceptor(result);
        }
        return result.data;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof ApiErrorClass && error.status < 500) break;
        if (attempt < retries) {
          await this.delay(finalConfig.retryDelay ?? DEFAULT_RETRY_DELAY * (attempt + 1));
        }
      }
    }

    if (lastError instanceof ApiErrorClass) {
      for (const interceptor of this.errorInterceptors) {
        await interceptor(lastError);
      }
    }
    throw lastError;
  }

  private async executeRequest<T>(path: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.auth !== false && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeout = config.timeout ?? DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: config.method ?? 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      if (!response.ok) {
        throw new ApiErrorClass(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          data
        );
      }

      return { data, status: response.status, headers: response.headers };
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new ApiErrorClass('Request timeout', 408);
      }
      throw new ApiErrorClass((error as Error).message, 0);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient();
