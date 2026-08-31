import { UserAccount } from '../types';
import { setInMemoryToken, getInMemoryToken } from './api';

const API_BASE_URL = '/api/auth';

export interface AuthSessionResponse {
  authenticated: boolean;
  user: UserAccount | null;
}

export const authService = {
  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.token) {
        setInMemoryToken(data.token);
      }
      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: 'Network error or server unavailable' };
    }
  },

  async logout(): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      const token = getInMemoryToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers,
        credentials: 'same-origin'
      });
    } catch (e) {
      console.warn('Logout warning', e);
    } finally {
      setInMemoryToken(null);
    }
  },

  async checkSession(): Promise<AuthSessionResponse> {
    try {
      const headers: Record<string, string> = {};
      const token = getInMemoryToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/session`, {
        headers,
        credentials: 'same-origin'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          if (data.token) {
            setInMemoryToken(data.token);
          }
          return { authenticated: true, user: data.user };
        }
      }
      setInMemoryToken(null);
      return { authenticated: false, user: null };
    } catch (error) {
      return { authenticated: false, user: null };
    }
  }
};
