import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/axios';

const EDITORIAL_IMAGE =
  'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setMessage(null);
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setState('sent');
      setMessage(data.message);
    } catch (err) {
      setState('idle');
      setMessage(apiErrorMessage(err));
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage('Passwords do not match');
      return;
    }
    setState('sending');
    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage('Password updated. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setState('idle');
      setMessage(apiErrorMessage(err));
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col">
      <header className="w-full px-4 md:px-10 h-20 flex justify-between items-center max-w-container mx-auto">
        <div className="font-display text-headline-md font-bold tracking-tighter text-on-surface">
          SEMMAI
        </div>
        <Link
          to="/login"
          className="text-label-md uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Login
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-[440px] bg-surface-container-lowest">
          <div className="mb-12 aspect-[4/3] overflow-hidden">
            <img
              src={EDITORIAL_IMAGE}
              alt="Minimalist fashion"
              className="w-full h-full object-cover grayscale brightness-95"
            />
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="font-display text-headline-md text-on-surface tracking-tight">
                {token ? 'Set a new password' : 'Forgot password?'}
              </h1>
              <p className="text-body-md text-on-surface-variant max-w-[360px]">
                {token
                  ? 'Choose a new password for your account. It must be at least 8 characters.'
                  : "Enter your email address and we'll send you a link to reset your password."}
              </p>
            </div>

            {token ? (
              <form className="space-y-10" onSubmit={resetPassword}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface-variant uppercase tracking-widest">
                      New password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:outline-none focus:border-on-surface transition-all text-body-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface-variant uppercase tracking-widest">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:outline-none focus:border-on-surface transition-all text-body-md"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="w-full bg-on-surface text-surface-container-lowest text-label-md uppercase py-5 flex justify-between items-center px-8 group hover:bg-primary transition-all duration-300 disabled:opacity-70"
                >
                  <span>{state === 'sending' ? 'Updating…' : 'Update Password'}</span>
                  <span className="material-symbols-outlined transform group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </form>
            ) : (
              <form className="space-y-10" onSubmit={requestLink}>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-label-md text-on-surface-variant uppercase tracking-widest"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:outline-none focus:border-on-surface transition-all placeholder:text-surface-dim text-body-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={state !== 'idle'}
                  className={`w-full text-label-md uppercase py-5 flex justify-between items-center px-8 group transition-all duration-300 ${
                    state === 'sent'
                      ? 'bg-primary text-on-primary'
                      : 'bg-on-surface text-surface-container-lowest hover:bg-primary disabled:opacity-70'
                  }`}
                >
                  <span>
                    {state === 'sent' ? 'Link Sent' : state === 'sending' ? 'Sending…' : 'Send Reset Link'}
                  </span>
                  <span className="material-symbols-outlined">
                    {state === 'sent' ? 'check_circle' : 'arrow_forward'}
                  </span>
                </button>
              </form>
            )}

            {message && <p className="text-body-sm text-on-surface-variant">{message}</p>}

            <div className="pt-8 border-t border-outline-variant">
              <p className="text-body-sm text-on-surface-variant">
                Still having trouble?{' '}
                <span className="text-on-surface font-bold underline underline-offset-4 cursor-pointer hover:text-primary transition-colors">
                  Contact support
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
