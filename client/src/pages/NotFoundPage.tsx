import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-24">
      <p className="text-label-md text-primary uppercase tracking-[0.3em] mb-4">404</p>
      <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg mb-6">
        Off the runway.
      </h1>
      <p className="text-body-lg text-on-surface-variant max-w-md mb-10">
        The page you're looking for has been archived or never existed.
      </p>
      <Link
        to="/"
        className="bg-primary text-on-primary px-12 py-4 text-label-md uppercase tracking-widest hover:bg-primary-container transition-all"
      >
        Return Home
      </Link>
    </main>
  );
}
