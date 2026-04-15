/** Base URL for the API. */
const API_BASE = '/api';

/**
 * Performs a GET request to the API.
 */
export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API GET ${path} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

/**
 * Performs a POST request to the API.
 */
export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API POST ${path} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

