import { useState } from 'react';
import { getFriendlyAuthError } from '../utils/auth.js';

export function useAuthSubmit() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      return await fn();
    } catch (err) {
      setError(getFriendlyAuthError(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { error, loading, run, setError };
}
