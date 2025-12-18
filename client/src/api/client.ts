import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_EXPIRED_MESSAGE = 'Token Expired';
const REFRESH_ENDPOINT = `${API_BASE_URL}/auth/refreshToken`;
const LOCAL_STATE_KEY = 'redux-state-v2';

type TokenErrorResponse = {
  message?: string;
  retry?: boolean;
};

type RetriableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

/**
 * Базовый HTTP-клиент для взаимодействия с backend API
 * Автоматически добавляет headers и обрабатывает ошибки
 */
class ApiClient {
  private instance: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 секунд — insights запросы тяжёлые
      headers: {
        'Content-Type': 'application/json',
        'x-request-from': 'internal',
      },
      withCredentials: true, // для передачи cookies с auth токенами
    });

    // Request interceptor - добавляем логирование только в DEV
    this.instance.interceptors.request.use(
      (config) => {
        if (import.meta.env.DEV) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - обработка ошибок
    this.instance.interceptors.response.use(
      (response) => {
        // В production не логируем успешные ответы (шум + утечка данных)
        if (import.meta.env.DEV) {
          console.log(`[API] Response ${response.config.url}: OK`);
        }
        return response;
      },
      async (error) => {
        // Ошибки логируем всегда - важно для debugging
        console.error('[API] Response error:', error.response?.status, error.response?.data?.message || error.message);

        const retryResponse = await this.handleUnauthorized(error);
        if (retryResponse) {
          return retryResponse;
        }

        // Обработка стандартных HTTP ошибок
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            console.warn('[API] Unauthorized - требуется авторизация');
          } else if (status === 403) {
            console.warn('[API] Forbidden - недостаточно прав');
          } else if (status === 404) {
            console.warn('[API] Not found');
          } else if (status >= 500) {
            console.error('[API] Server error:', data);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized(error: any): Promise<AxiosResponse | null> {
    const { response, config } = error;
    if (!response || response.status !== 401 || !config) {
      return null;
    }

    const originalRequest = config as RetriableRequestConfig;
    if (originalRequest.url?.includes('/auth/refreshToken')) {
      this.cleanupAuthState();
      this.redirectToSignin();
      return null;
    }

    const tokenError = response.data as TokenErrorResponse;
    const shouldRetry =
      tokenError?.message === TOKEN_EXPIRED_MESSAGE &&
      tokenError?.retry === true &&
      !originalRequest._retry;

    if (shouldRetry) {
      originalRequest._retry = true;
      try {
        const refreshed = await this.requestNewToken();
        if (refreshed) {
          console.log('[API] Access token refreshed, retrying original request');
          return this.instance.request(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API] Refresh token request failed:', refreshError);
      }
    }

    this.cleanupAuthState();
    this.redirectToSignin();
    return null;
  }

  private requestNewToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = axios
        .post(REFRESH_ENDPOINT, {}, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'x-request-from': 'internal'
          }
        })
        .then((response) => Boolean(response.data?.id))
        .catch((error) => {
          throw error;
        });

      this.refreshPromise.finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private cleanupAuthState() {
    try {
      localStorage.removeItem(LOCAL_STATE_KEY);
      localStorage.removeItem('currentProjectId');
    } catch (storageError) {
      console.warn('[API] Unable to clear localStorage after 401:', storageError);
    }
  }

  private redirectToSignin() {
    if (typeof window !== 'undefined' && window.location.pathname !== '/signin') {
      window.location.href = '/signin';
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }
}

export default new ApiClient();
