'use client';

import { useState, useCallback } from 'react';
import { handleApiError, logError } from '../utils/error-handling';

interface OperationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  context?: string;
}

export function useCredentialOperation() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: OperationOptions
  ): Promise<T | undefined> => {
    setIsPending(true);
    setError(null);
    
    try {
      const result = await operation();
      if (options?.onSuccess) {
        options.onSuccess();
      }
      return result;
    } catch (e) {
      const errorMessage = handleApiError(e);
      logError(e, { context: options?.context || 'useCredentialOperation' });
      setError(errorMessage);
      
      if (options?.onError) {
        options.onError(errorMessage);
      }
      
      return undefined;
    } finally {
      setIsPending(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isPending,
    error,
    execute,
    clearError,
  };
}
