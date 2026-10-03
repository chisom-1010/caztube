// lib/api.ts
import { Video } from '../shared/types/video';
import { User } from '../shared/types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'caztube_token';

const isDev = process.env.NODE_ENV === 'development';
function log(...args: unknown[]) {
  if (isDev) console.log(...args);
}

// Reads the user id out of a JWT's payload, without verifying the signature
// (verification happens server-side — this is just for convenience on the client).
function decodeUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  private setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    log('API request:', options.method || 'GET', url);

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch {
      throw new Error(`Network error: cannot reach ${url}. Is the backend running?`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const raw = await response.text();
    const data = isJson && raw ? JSON.parse(raw) : raw;

    if (!response.ok) {
      const message =
        (isJson && data && (data.detail || data.message)) ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    return data as T;
  }

  // --- Auth ---

  async register(username: string, email: string, password: string) {
    return this.request<{ id: string; username: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<{ user: User }> {
    const { access_token } = await this.request<{ access_token: string; token_type: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    this.setToken(access_token);

    const userId = decodeUserIdFromToken(access_token);
    if (!userId) throw new Error('Received an invalid token from the server');

    const user = await this.getUser(userId);
    return { user };
  }

  // --- Users ---

  async getUser(userId: string) {
    return this.request<User>(`/users/${userId}`);
  }

  async updateUsername(username: string) {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
  }

  // --- Videos ---

  async getVideos() {
    return this.request<Video[]>('/videos');
  }

  async getVideo(id: string) {
    return this.request<Video>(`/videos/${id}`);
  }

  // owner_id is no longer passed — the backend derives it from the Bearer token
  async createVideo(title: string, description?: string, r2Key?: string) {
    const query = r2Key ? `?r2_key=${encodeURIComponent(r2Key)}` : '';
    return this.request<Video>(`/videos${query}`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async deleteVideo(id: string) {
    return this.request<{ deleted: boolean }>(`/videos/${id}`, {
      method: 'DELETE',
    });
  }

  async getUploadUrl(filename: string, contentType: string) {
    return this.request<{ upload_url: string; r2_key: string }>('/videos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, content_type: contentType }),
    });
  }

  // --- Streaming ---

  async getStreamUrl(id: string) {
    return this.request<{ stream_url: string }>(`/stream/${id}`);
  }

  // --- Health ---

  async checkHealth() {
    return this.request<{ status: string; service: string }>('/');
  }
}

export const apiClient = new ApiClient();
