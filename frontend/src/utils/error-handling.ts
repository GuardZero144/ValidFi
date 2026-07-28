export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorDetails {
  code?: string;
  context?: string;
  severity?: ErrorSeverity;
  [key: string]: any;
}

export class CredentialError extends Error {
  public code: string;
  public severity: ErrorSeverity;
  
  constructor(message: string, code = 'UNKNOWN_ERROR', severity = ErrorSeverity.MEDIUM) {
    super(message);
    this.name = 'CredentialError';
    this.code = code;
    this.severity = severity;
  }
}

export class NetworkError extends CredentialError {
  constructor(message = 'A network error occurred while communicating with the server.') {
    super(message, 'NETWORK_ERROR', ErrorSeverity.HIGH);
    this.name = 'NetworkError';
  }
}

export function logError(error: Error | unknown, details?: ErrorDetails): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  console.error(`[Error Logger] ${errorObj.name}: ${errorObj.message}`, {
    stack: errorObj.stack,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

export function handleApiError(error: unknown): string {
  if (error instanceof CredentialError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}
