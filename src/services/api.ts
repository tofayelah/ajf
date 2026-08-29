import { AppDatabaseState } from './db';

const API_BASE_URL = '/api';

export async function fetchDatabaseFromAPI(): Promise<AppDatabaseState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/sync`);
    if (!response.ok) {
      if (response.status === 404 || response.status === 503) return null;
      throw new Error(`Failed to fetch database: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API Fetch Error]:', error);
    return null;
  }
}

export async function saveDatabaseToAPI(db: AppDatabaseState): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(db)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[API Save Error]:', error);
    return { success: false, error: error.message };
  }
}
