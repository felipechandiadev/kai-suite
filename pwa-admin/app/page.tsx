'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextField } from '@kai/ui';

const POST_LOGIN_PATH = '/dashboard';

export default function LoginPage() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(POST_LOGIN_PATH);
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await signIn('credentials', {
        userName,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas');
        return;
      }

      router.push(POST_LOGIN_PATH);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-test-id="login-session-redirect"
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo.png"
            alt="KaiStore"
            className="h-20 w-20 object-contain"
          />
          <div className="mt-3 flex flex-col gap-0 leading-none">
            <span className="block text-2xl font-bold leading-tight tracking-tight text-foreground">
              KaiStore
            </span>
            <span className="-mt-px block text-[11px] font-normal leading-tight text-muted sm:text-xs">
              Administración
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <TextField
              label="Usuario"
              name="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder=""
              required
              disabled={submitting}
              autoComplete="username"
              className="w-full"
            />
          </div>
          <div className="mb-6">
            <TextField
              label="Contraseña"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
              disabled={submitting}
              autoComplete="current-password"
              className="w-full"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            loading={submitting}
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
