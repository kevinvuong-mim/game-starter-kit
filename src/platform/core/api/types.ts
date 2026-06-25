export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  auth?: boolean;
  body?: unknown;
  retries?: number;
  timeout?: number;
  method?: HttpMethod;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export type RequestInterceptor = (
  url: string,
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = <T>(
  response: ApiResponse<T>
) => ApiResponse<T> | Promise<ApiResponse<T>>;

export type ErrorInterceptor = (error: ApiError) => void | Promise<void>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface IApiClient {
  setAuthToken(token: string | null): void;
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  delete<T>(path: string, config?: RequestConfig): Promise<T>;
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void;
  addRequestInterceptor(interceptor: RequestInterceptor): () => void;
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
  put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
}
