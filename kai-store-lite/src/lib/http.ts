/** Shared fetch options type (Lite uses Tauri invoke; HTTP Core removed). */
export type FetchOpts = RequestInit & { skipAuth?: boolean };
