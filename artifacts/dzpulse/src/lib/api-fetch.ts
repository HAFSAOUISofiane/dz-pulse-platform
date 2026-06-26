const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export const apiFetch = (url: string, init?: RequestInit): Promise<Response> =>
  fetch(`${BASE}${url}`, init);
