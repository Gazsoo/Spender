import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../auth/AuthContext';
import styles from './LoginPage.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed: "This Google account isn't authorized to use this app.",
  invalid_token: 'Sign-in failed. Please try again.',
};

export default function LoginPage() {
  const { user, isLoading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(null);
    if (!credentialResponse.credential) {
      setError(ERROR_MESSAGES.invalid_token);
      return;
    }

    try {
      await signIn(credentialResponse.credential);
    } catch (err) {
      let reason = '';
      if (err instanceof Error) {
        try {
          reason = (JSON.parse(err.message) as { reason?: string }).reason ?? '';
        } catch {
          reason = '';
        }
      }
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.invalid_token);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Spender</div>
        <p className={styles.subtitle}>Sign in with Google to continue</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError(ERROR_MESSAGES.invalid_token)}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
