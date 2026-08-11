import { useState } from 'react';
import { validatePassword } from '@/utils/auth.js';

export function usePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validate = () => {
    if (password !== confirmPassword) return 'Passwords do not match.';
    return validatePassword(password);
  };

  return { password, setPassword, confirmPassword, setConfirmPassword, validate };
}
