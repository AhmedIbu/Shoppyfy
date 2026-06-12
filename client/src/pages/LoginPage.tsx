import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuthError, login } from '../store/authSlice';

const EDITORIAL_IMAGE =
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <main className="min-h-screen flex">
      {/* Editorial side */}
      <section className="hidden md:block flex-1 relative bg-on-surface overflow-hidden">
        <img
          src={EDITORIAL_IMAGE}
          alt="High-fashion editorial"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display text-headline-md text-white mb-2 leading-tight">
            Curation as an art form.
          </p>
          <p className="text-body-md text-white/80 max-w-sm">
            Discover the latest collection of seasonal essentials and timeless designer pieces.
          </p>
        </div>
      </section>

      {/* Form side */}
      <section className="w-full md:max-w-[560px] bg-surface-container-lowest flex flex-col justify-center p-10">
        <div className="max-w-md mx-auto w-full">
          <header className="mb-12">
            <h1 className="font-display text-headline-md font-bold tracking-tighter text-on-surface mb-8">
              SEMMAI
            </h1>
            <h2 className="font-display text-headline-sm text-on-surface mb-2">Welcome back</h2>
            <p className="text-body-md text-on-surface-variant">
              Please enter your details to access your account.
            </p>
          </header>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-label-md text-on-surface-variant uppercase tracking-widest"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="border-0 border-b border-outline-variant focus:border-on-surface focus:ring-0 focus:outline-none px-0 py-2 text-body-md w-full bg-transparent placeholder:text-surface-dim transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-label-md text-on-surface-variant uppercase tracking-widest"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-0 border-b border-outline-variant focus:border-on-surface focus:ring-0 focus:outline-none px-0 py-2 pr-10 text-body-md w-full bg-transparent placeholder:text-surface-dim transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-0 bottom-2 text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded-sm border-outline text-primary focus:ring-0"
                />
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Remember me
                </span>
              </label>
              <Link
                to="/reset-password"
                className="text-body-sm text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-body-sm text-error bg-error-container/40 border border-error-container px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full h-14 bg-on-surface text-surface-container-lowest text-label-md uppercase tracking-[0.15em] transition-all hover:bg-primary-container active:opacity-80 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {status === 'loading' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <footer className="mt-12 pt-8 border-t border-outline-variant text-center">
            <p className="text-body-sm text-on-surface-variant">
              Don't have an account?
              <Link
                to="/register"
                className="text-on-surface font-semibold hover:underline underline-offset-4 ml-1"
              >
                Create an account
              </Link>
            </p>
            <p className="mt-4 text-label-md text-on-surface-variant/70">
              Demo: julianna@shoppyfy.com · maison@shoppyfy.com · admin@shoppyfy.com — Password123!
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
