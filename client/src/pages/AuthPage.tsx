import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuthError, login, register } from '../store/authSlice';
import { onImgError } from '../utils/imgFallback';

const LOGIN_MODEL =
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80';
const REGISTER_MODEL =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80';

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, status, error } = useAppSelector((s) => s.auth);

  const isSeller = searchParams.get('role') === 'seller';
  const initMode: 'login' | 'register' =
    isSeller || location.pathname === '/register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initMode);

  const switchMode = (next: 'login' | 'register') => {
    dispatch(clearAuthError());
    setMode(next);
    navigate(next === 'login' ? '/login' : '/register', { replace: true });
  };

  // ── Login form state ──────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ── Register form state ───────────────────────────────
  const [role, setRole] = useState<'BUYER' | 'SELLER'>(isSeller ? 'SELLER' : 'BUYER');
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'SELLER') navigate('/seller', { replace: true });
    else navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email: loginEmail, password: loginPassword }));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (regPassword !== regConfirm) {
      setLocalError('Passwords do not match');
      return;
    }
    if (!terms) {
      setLocalError('Please accept the Terms & Conditions');
      return;
    }
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    dispatch(
      register({
        firstName: firstName ?? '',
        lastName: rest.join(' ') || firstName,
        email: regEmail,
        password: regPassword,
        role,
      })
    );
  };

  const shownError = localError ?? error;

  // ─────────────────────────────────────────────────────
  // Shared input style
  const inputCls =
    'border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-body-md w-full bg-transparent placeholder:text-on-surface-variant/40 transition-colors';

  // ── Login form JSX ────────────────────────────────────
  const loginForm = (
    <div className="w-full h-full bg-surface-container-lowest flex flex-col px-10 py-12 overflow-y-auto">
      <div className="max-w-xs mx-auto my-auto w-full">
        <h2 className="font-display text-headline-sm text-on-surface font-bold mb-1">Welcome back</h2>
        <p className="text-body-sm text-on-surface-variant mb-8">Sign in to your account</p>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-on-surface-variant uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="name@example.com"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-on-surface-variant uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <input
                type={showLoginPw ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowLoginPw((s) => !s)}
                className="absolute right-0 bottom-2 text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="Toggle password visibility"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showLoginPw ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 border-outline text-primary focus:ring-0" />
              <span className="text-body-sm text-on-surface-variant">Remember me</span>
            </label>
            <Link
              to="/reset-password"
              className="text-body-sm text-primary hover:underline underline-offset-4"
            >
              Forgot?
            </Link>
          </div>

          {error && mode === 'login' && (
            <p className="text-body-sm text-error bg-error-container/40 border border-error-container px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full h-12 bg-primary text-on-primary text-label-md uppercase tracking-widest hover:bg-primary-container transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {status === 'loading' && mode === 'login' ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-label-md text-on-surface-variant/60">
          Demo: julianna@shoppyfy.com · Password123!
        </p>
      </div>
    </div>
  );

  // ── Register form JSX ─────────────────────────────────
  const registerForm = (
    <div className="w-full h-full bg-surface-container-lowest flex flex-col px-10 py-12 overflow-y-auto">
      <div className="max-w-xs mx-auto my-auto w-full">
        <h2 className="font-display text-headline-sm text-on-surface font-bold mb-1">Create Account</h2>
        <p className="text-body-sm text-on-surface-variant mb-6">Join the editorial ecosystem</p>

        <form className="space-y-5" onSubmit={handleRegister}>
          {/* Role selector */}
          <div className="flex gap-3">
            {(['BUYER', 'SELLER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 px-4 border text-label-md uppercase tracking-wide transition-all duration-200 ${
                  role === r
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                }`}
              >
                {r === 'BUYER' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>

          {[
            { value: fullName, set: setFullName, placeholder: 'Full Name', type: 'text', label: 'Name' },
            { value: regEmail, set: setRegEmail, placeholder: 'Email Address', type: 'email', label: 'Email' },
            {
              value: regPassword,
              set: setRegPassword,
              placeholder: 'Min 8 characters',
              type: 'password',
              label: 'Password',
            },
            {
              value: regConfirm,
              set: setRegConfirm,
              placeholder: 'Repeat password',
              type: 'password',
              label: 'Confirm',
            },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant uppercase tracking-widest">
                {f.label}
              </label>
              <input
                type={f.type}
                required
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            </div>
          ))}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 border-outline text-primary focus:ring-0"
            />
            <span className="text-body-sm text-on-surface-variant">
              I agree to the{' '}
              <span className="text-on-surface font-semibold underline decoration-outline-variant">
                Terms
              </span>{' '}
              and{' '}
              <span className="text-on-surface font-semibold underline decoration-outline-variant">
                Privacy Policy
              </span>
            </span>
          </label>

          {shownError && mode === 'register' && (
            <p className="text-body-sm text-error bg-error-container/40 border border-error-container px-4 py-3">
              {shownError}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full h-12 bg-primary text-on-primary text-label-md uppercase tracking-widest hover:bg-primary-container transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {status === 'loading' && mode === 'register' ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface py-8 px-4">
      {/* Sliding panel layout — horizontal split on desktop, vertical on mobile */}
      <div
        className={`auth-container w-full max-w-4xl h-[760px] md:h-[640px] shadow-2xl${
          mode === 'register' ? ' active' : ''
        }`}
      >
        {/* Login form — left half */}
        <div className="auth-form-container auth-sign-in">{loginForm}</div>

        {/* Register form — appears on right when active */}
        <div className="auth-form-container auth-sign-up">{registerForm}</div>

        {/* Sliding green overlay panel */}
        <div className="auth-overlay-container">
          <div className="auth-overlay">
            {/* Left panel — "Welcome Back!" shown when register mode active */}
            <div className="auth-overlay-panel auth-overlay-left">
              <img
                src={REGISTER_MODEL}
                alt="Fashion editorial"
                onError={onImgError}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="relative z-10 flex flex-col items-center text-center px-10">
                <p className="font-display text-headline-sm text-on-primary font-bold mb-3 leading-tight">
                  Welcome Back!
                </p>
                <p className="text-body-sm text-on-primary/80 mb-8 max-w-[220px]">
                  Sign in to continue your editorial journey
                </p>
                <button
                  onClick={() => switchMode('login')}
                  className="border-2 border-on-primary text-on-primary py-3 px-10 text-label-md uppercase tracking-widest hover:bg-on-primary hover:text-primary transition-all duration-300"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Right panel — "Hello, Friend!" shown by default (login mode) */}
            <div className="auth-overlay-panel auth-overlay-right">
              <img
                src={LOGIN_MODEL}
                alt="Fashion editorial"
                onError={onImgError}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="relative z-10 flex flex-col items-center text-center px-10">
                <p className="font-display text-headline-sm text-on-primary font-bold mb-3 leading-tight">
                  Hello, Friend!
                </p>
                <p className="text-body-sm text-on-primary/80 mb-8 max-w-[220px]">
                  New here? Join our curated community of editors
                </p>
                <button
                  onClick={() => switchMode('register')}
                  className="border-2 border-on-primary text-on-primary py-3 px-10 text-label-md uppercase tracking-widest hover:bg-on-primary hover:text-primary transition-all duration-300"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
