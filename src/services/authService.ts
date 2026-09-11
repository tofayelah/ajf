import { UserAccount } from '../types';
import { setInMemoryToken, getInMemoryToken } from './api';

const API_BASE_URL = '/api/auth';

export interface AuthSessionResponse {
  authenticated: boolean;
  user: UserAccount | null;
  sessionExpired?: boolean;
  message?: string;
}

export const authService = {
  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: UserAccount; locked?: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || 'Your user or password is wrong',
          locked: !!data.locked
        };
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
      
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data.authenticated && data.user) {
          if (data.token) {
            setInMemoryToken(data.token);
          }
          return { authenticated: true, user: data.user };
        }
      } else if (response.status === 401 && (data.code === 'SESSION_EXPIRED' || data.expired)) {
        setInMemoryToken(null);
        return { 
          authenticated: false, 
          user: null, 
          sessionExpired: true, 
          message: data.error || 'Your session has expired due to inactivity. Please login again.' 
        };
      }

      setInMemoryToken(null);
      return { authenticated: false, user: null };
    } catch (error) {
      return { authenticated: false, user: null };
    }
  },

  async touch(): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      const token = getInMemoryToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE_URL}/touch`, {
        method: 'POST',
        headers,
        credentials: 'same-origin'
      });
    } catch (e) {}
  },

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string; targetUserId?: string }): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getInMemoryToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to change password' };
      }
      return { success: true, message: result.message || 'Password changed successfully' };
    } catch (err: any) {
      return { success: false, error: 'Network error or server unavailable' };
    }
  }
};
