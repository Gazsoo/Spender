import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../auth/AuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed: "This Google account isn't authorized to use this app.",
  invalid_token: 'Sign-in failed. Please try again.',
};

export default function LoginPage() {
  const { user, isLoading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) return <Navigate to="/home" replace />;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(null);
    if (!credentialResponse.credential) { setError(ERROR_MESSAGES.invalid_token); return; }
    try {
      await signIn(credentialResponse.credential);
    } catch (err) {
      let reason = '';
      if (err instanceof Error) {
        try { reason = (JSON.parse(err.message) as { reason?: string }).reason ?? ''; } catch {}
      }
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.invalid_token);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 w-80 flex flex-col items-center gap-5 text-center">
        <span className="font-display font-black text-2xl tracking-tight text-gray-900">Spender</span>
        <p className="text-sm text-gray-500">Sign in with Google to continue</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError(ERROR_MESSAGES.invalid_token)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}
