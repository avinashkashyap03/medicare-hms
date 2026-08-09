import { useState } from 'react';
import { getFriendlyAuthError } from '@/utils/auth.js';

export function useAuthSubmit() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      const data = await fn();
      return { ok: true, data, error: null };
    } catch (err) {
      const message = getFriendlyAuthError(err);
      if (message) {
        setError(message);
        return { ok: false, data: null, error: message };
      }
      console.error('Unhandled error in auth submit:', err);
      const fallback = 'Something went wrong. Please try again.';
      setError(fallback);
      return { ok: false, data: null, error: fallback };
    } finally {
      setLoading(false);
    }
  };

  return { error, loading, run, setError };
}
