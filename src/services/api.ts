import { AppDatabaseState } from './db';

const API_BASE_URL = '/api';

let inMemoryAuthToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function getInMemoryToken(): string | null {
  return inMemoryAuthToken;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (inMemoryAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAuthToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  return response;
}

export async function fetchDatabaseFromAPI(): Promise<AppDatabaseState | null> {
  try {
    const response = await authenticatedFetch('/sync');
    if (!response.ok) {
      if (response.status === 404 || response.status === 503) return null;
      if (response.status === 401 || response.status === 403) return null;
      throw new Error(`Failed to fetch database: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[API Fetch Notice]:', error);
    return null;
  }
}

export async function saveDatabaseToAPI(db: AppDatabaseState): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authenticatedFetch('/sync', {
      method: 'POST',
      body: JSON.stringify(db)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: err.error || 'Unauthorized: No session token' };
      }
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error: any) {
    console.warn('[API Save Notice]:', error?.message || error);
    return { success: false, error: error.message };
  }
}

export async function fetchUsersAPI() {
  const response = await authenticatedFetch('/users');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch users', response.status, err);
  }
  return response.json();
}

export async function createUserAPI(data: any) {
  const response = await authenticatedFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to create user', response.status, err);
  }
  return response.json();
}

export async function updateUserAPI(userId: string, data: any) {
  const response = await authenticatedFetch(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to update user', response.status, err);
  }
  return response.json();
}

export async function resetUserPasswordAPI(userId: string, password: string) {
  const response = await authenticatedFetch(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to reset password', response.status, err);
  }
  return response.json();
}

export async function resetUserPinAPI(userId: string, pin: string) {
  const response = await authenticatedFetch(`/users/${userId}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to reset PIN', response.status, err);
  }
  return response.json();
}

export async function assignUserRoleAPI(userId: string, role: string) {
  const response = await authenticatedFetch(`/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to update role', response.status, err);
  }
  return response.json();
}

export async function assignUserPermissionsAPI(userId: string, permissions: string[]) {
  const response = await authenticatedFetch(`/users/${userId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permissions })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to update permissions', response.status, err);
  }
  return response.json();
}

export async function deleteUserAPI(userId: string) {
  const response = await authenticatedFetch(`/users/${userId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to delete user', response.status, err);
  }
  return response.json();
}

export async function fetchFinancialSummaryAPI(params?: { period?: string; startDate?: string; endDate?: string }) {
  let url = '/financial-summary';
  if (params) {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch financial summary', response.status, err);
  }
  return response.json();
}

export async function fetchMemberFinancialSummaryAPI(params?: { period?: string; startDate?: string; endDate?: string }) {
  return fetchFinancialSummaryAPI(params);
}

export async function fetchMemberProfileAPI(memberId: string) {
  const response = await authenticatedFetch(`/members/${encodeURIComponent(memberId)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch member profile', response.status, err);
  }
  return response.json();
}

export async function fetchMembersAPI(params?: { search?: string; status?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);
  const qs = queryParams.toString();
  const endpoint = `/members${qs ? `?${qs}` : ''}`;
  
  const response = await authenticatedFetch(endpoint);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch members list', response.status, err);
  }
  return response.json();
}

export async function fetchCashReconciliationDiagnosticAPI() {
  const response = await authenticatedFetch('/reconciliation/diagnostic');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch reconciliation diagnostic', response.status, err);
  }
  return response.json();
}

export async function syncMissingCashTransactionsAPI(options?: { dryRun?: boolean }) {
  const response = await authenticatedFetch('/reconciliation/sync-cash-transactions', {
    method: 'POST',
    body: JSON.stringify({ dryRun: options?.dryRun ?? false })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to execute cash transactions synchronization', response.status, err);
  }
  return response.json();
}

export async function getFactoryResetPreviewAPI() {
  const response = await authenticatedFetch('/admin/factory-reset/preview');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch factory reset preview', response.status, err);
  }
  return response.json();
}

export async function executeFactoryResetAPI(confirmationPhrase: string, reason?: string) {
  const response = await authenticatedFetch('/admin/factory-reset', {
    method: 'POST',
    body: JSON.stringify({ confirmationPhrase, reason })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to execute factory reset', response.status, err);
  }
  return response.json();
}

export async function fetchBackupPreviewAPI() {
  const response = await authenticatedFetch('/admin/backup/preview');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to fetch backup preview', response.status, err);
  }
  return response.json();
}

export async function downloadAuthoritativeBackupAPI(allowEmpty?: boolean) {
  const url = `/admin/backup/download${allowEmpty ? '?allowEmpty=true' : ''}`;
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to download server backup', response.status, err);
  }
  return response.json();
}

export async function validateRestoreBackupAPI(backupPackage: any) {
  const response = await authenticatedFetch('/admin/restore/validate', {
    method: 'POST',
    body: JSON.stringify({ backupPackage })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to validate backup', response.status, err);
  }
  return response.json();
}

export async function executeRestoreBackupAPI(confirmationPhrase: string, backupPackage: any, reason?: string) {
  const response = await authenticatedFetch('/admin/restore/execute', {
    method: 'POST',
    body: JSON.stringify({ confirmationPhrase, backupPackage, reason })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.error || 'Failed to restore database from backup', response.status, err);
  }
  return response.json();
}







