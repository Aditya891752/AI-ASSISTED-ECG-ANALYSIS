import axios, { AxiosError } from "axios";

export const API_BASE_URL = "/api/v1";

export const apiClient = axios.create({
  baseURL: "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function messageForError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError;
    if (!err.response) {
      return "Cannot reach backend — ensure docker-compose is running on port 8000";
    }
    switch (err.response.status) {
      case 422:
        return "Invalid signal — check sample count (min 360) and ensure no NaN values";
      case 413:
        return "Signal too large — maximum upload size is 50 MB";
      case 429:
        return "Rate limit reached — wait a moment before retrying";
      case 503:
        return "Model not loaded — the AI model is starting up, try again in a few seconds";
      default:
        return `Request failed (${err.response.status})`;
    }
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error)
);
