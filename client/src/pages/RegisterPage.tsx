import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuthError, register } from '../store/authSlice';

const EDITORIAL_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80';

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, status, error } = useAppSelector((s) => s.auth);

  const [role, setRole] = useState<'BUYER' | 'SELLER'>(
    params.get('role') === 'seller' ? 'SELLER' : 'BUYER'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (user) navigate(user.role === 'SELLER' ? '/seller' : '/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirm) {
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
        email,
        password,
        role,
      })
    );
  };

  const shownError = localError ?? error;

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Editorial side */}
      <section className="hidden md:block w-1/2 relative bg-surface-container overflow-hidden min-h-screen">
        <img
          src={EDITORIAL_IMAGE}
          alt="High-fashion editorial"
          className="w-full h-full object-cover grayscale"
        />
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-12 left-12">
          <h1 className="font-display text-headline-md font-bold tracking-tighter text-white drop-shadow-sm">
            SHOPPYFY
          </h1>
        </div>
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display text-headline-md text-white opacity-90 leading-tight">
            THE CURATED
            <br />
            COLLECTIVE.
          </p>
        </div>
      </section>

      {/* Form side */}
      <section className="w-full md:w-1/2 flex items-center justify-center bg-surface-container-lowest px-4 md:px-24 py-16">
        <div className="max-w-md w-full">
          <div className="md:hidden mb-12">
            <h1 className="font-display text-headline-md font-bold tracking-tighter text-on-surface">
              SHOPPYFY
            </h1>
          </div>
          <div className="space-y-2 mb-10">
            <h2 className="font-display text-headline-md text-on-surface">Create Account</h2>
            <p className="text-body-md text-on-surface-variant">
              Step into the editorial ecosystem of Shoppyfy.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Role selector */}
            <div className="space-y-3">
              <label className="text-label-md text-on-surface uppercase tracking-widest">
                Select Your Role
              </label>
              <div className="flex gap-4">
                {(['BUYER', 'SELLER'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 px-6 border text-label-md uppercase transition-all duration-200 ${
                      role === r
                        ? 'border-on-surface bg-on-surface text-white'
                        : 'border-outline text-on-surface-variant hover:border-on-surface hover:text-on-surface'
                    }`}
                  >
                    {r === 'BUYER' ? 'Buy' : 'Sell'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {[
                { value: fullName, set: setFullName, placeholder: 'Full Name', type: 'text' },
                { value: email, set: setEmail, placeholder: 'Email Address', type: 'email' },
                { value: password, set: setPassword, placeholder: 'Password (min 8 characters)', type: 'password' },
                { value: confirm, set: setConfirm, placeholder: 'Confirm Password', type: 'password' },
              ].map((field) => (
                <input
                  key={field.placeholder}
                  type={field.type}
                  required
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 text-body-md placeholder:text-on-surface-variant/50 focus:ring-0 focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded-none border-on-surface text-primary focus:ring-0"
              />
              <label htmlFor="terms" className="text-body-sm text-on-surface-variant">
                I agree to the{' '}
                <span className="text-on-surface font-semibold underline decoration-outline-variant">
                  Terms &amp; Conditions
                </span>{' '}
                and{' '}
                <span className="text-on-surface font-semibold underline decoration-outline-variant">
                  Privacy Policy
                </span>
                .
              </label>
            </div>

            {shownError && (
              <p className="text-body-sm text-error bg-error-container/40 border border-error-container px-4 py-3">
                {shownError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 bg-on-surface text-white text-label-md uppercase tracking-widest hover:bg-primary transition-colors duration-300 disabled:opacity-60"
            >
              {status === 'loading' ? 'Creating…' : 'Create Account'}
            </button>

            <div className="pt-4 text-center">
              <p className="text-body-sm text-on-surface-variant">
                Already have an account?
                <Link
                  to="/login"
                  className="text-label-md text-on-surface font-bold ml-2 hover:text-primary transition-colors uppercase"
                >
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
