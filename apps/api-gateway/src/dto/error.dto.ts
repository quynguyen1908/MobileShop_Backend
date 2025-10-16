export interface ServiceError {
  statusCode?: number;
  logMessage?: string;
}

export interface FallbackResponse {
  fallback: boolean;
  message: string;
}
