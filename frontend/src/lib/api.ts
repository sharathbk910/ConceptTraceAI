const API_BASE = '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error: {
    code: string;
    message: string;
  } | null;
}

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

class ApiClient {
  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('concepttrace_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  public async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = `${API_BASE}${endpoint}`;
    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          search.append(k, String(v));
        }
      });
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(res);
  }

  public async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(res);
  }

  public async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(res);
  }

  public async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(res);
  }

  public async delete<T = any>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(res);
  }

  public async downloadPdf(endpoint: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new ApiError('Failed to generate PDF progress report');
    }

    return res.blob();
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type');
    let json: ApiResponse<T>;

    if (contentType && contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      throw new ApiError(text || `HTTP error ${res.status}`);
    }

    if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED' || json?.error?.code === 'AUTH_FAILED') {
      localStorage.removeItem('concepttrace_token');
      localStorage.removeItem('concepttrace_user');
      localStorage.removeItem('concepttrace_education_profile');
    }

    if (!json.success || json.error) {
      throw new ApiError(json.error?.message || 'Request failed', json.error?.code || 'UNKNOWN_ERROR');
    }

    return json.data;
  }
}

export const api = new ApiClient();
