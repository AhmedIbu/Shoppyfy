import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { resetCart } from '../store/cartSlice';
import { resetWishlist } from '../store/wishlistSlice';

const navLinks = [
  { label: 'New Arrivals', to: '/shop?sort=newest' },
  { label: 'Designers', to: '/shop' },
  { label: 'Sustainable', to: '/shop?condition=LIKE_NEW' },
  { label: 'Vintage', to: '/shop?condition=GOOD' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const itemCount = useAppSelector((s) => s.cart.itemCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLinkActive = (to: string) => location.pathname + location.search === to;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await dispatch(logout());
    dispatch(resetCart());
    dispatch(resetWishlist());
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-primary py-1.5 px-4 text-center">
        <p className="inter text-[10px] tracking-[1.5px] uppercase text-on-primary/65">
          Free shipping on orders above ₹999
          <span className="hidden sm:inline"> · Easy 7-day returns</span>
          <span className="hidden md:inline"> · New drops every Thursday</span>
        </p>
      </div>

      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-surface border-b border-divider'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="relative flex justify-between items-center w-full px-4 md:px-10 max-w-container mx-auto h-20">
          {/* Left: desktop nav links */}
          <div className="hidden md:flex gap-8 flex-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={`text-label-md uppercase pb-0.5 transition-colors duration-300 ${
                  isLinkActive(link.to)
                    ? 'text-on-surface border-b-[1.5px] border-primary'
                    : 'text-muted border-b-[1.5px] border-transparent hover:text-primary'
                }`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="md:hidden flex-1" />

          {/* Center: wordmark */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 font-display text-[20px] md:text-[24px] font-normal tracking-[4px] text-on-surface uppercase"
          >
            Shoppyfy
          </Link>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-3 md:gap-6 flex-1">
            <Link
              to={user?.role === 'SELLER' || user?.role === 'ADMIN' ? '/seller' : '/register?role=seller'}
              className="hidden lg:block text-on-surface text-label-md uppercase hover:text-primary transition-colors"
            >
              Sell on Shoppyfy
            </Link>
            <div className="flex items-center gap-4">
              <button
                aria-label="Search"
                onClick={() => { navigate('/search'); closeMobile(); }}
                className="material-symbols-outlined text-on-surface hover:text-primary transition-all active:scale-95"
              >
                search
              </button>
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="material-symbols-outlined text-on-surface hover:text-primary transition-all active:scale-95"
              >
                favorite
              </Link>
              <Link
                to="/cart"
                aria-label="Cart"
                className="relative material-symbols-outlined text-on-surface hover:text-primary transition-all active:scale-95"
              >
                shopping_bag
                {itemCount > 0 && (
                  <span className="absolute top-[-5px] right-[-6px] bg-surface text-primary text-[9px] inter font-medium rounded-full w-[14px] h-[14px] flex items-center justify-center border border-primary/20">
                    {itemCount}
                  </span>
                )}
              </Link>
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="w-8 h-8 rounded-pill bg-surface-container-highest overflow-hidden flex items-center justify-center"
                    aria-label="Account menu"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-label-md font-semibold text-on-surface-variant">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </span>
                    )}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-surface-container-lowest border border-outline-variant shadow-xl py-2 z-50">
                      <div className="px-4 py-3 border-b border-outline-variant">
                        <p className="text-body-sm font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-label-md text-on-surface-variant truncate">{user.email}</p>
                      </div>
                      {[
                        { label: 'My Profile', to: '/profile' },
                        { label: 'My Orders', to: '/orders' },
                        { label: 'Wishlist', to: '/wishlist' },
                        ...(user.role === 'SELLER' || user.role === 'ADMIN'
                          ? [{ label: 'Seller Dashboard', to: '/seller' }]
                          : []),
                        ...(user.role === 'ADMIN' ? [{ label: 'Admin', to: '/admin' }] : []),
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-body-sm hover:bg-surface-container hover:text-primary transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-body-sm text-error hover:bg-surface-container transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-label-md uppercase border border-on-surface px-4 py-2 hover:bg-on-surface hover:text-surface transition-all"
                >
                  Sign In
                </Link>
              )}

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="md:hidden material-symbols-outlined text-on-surface hover:text-primary transition-colors"
              >
                {mobileOpen ? 'close' : 'menu'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-20 bg-on-surface z-40 flex flex-col overflow-y-auto">
          <nav className="flex flex-col px-6 pt-8 pb-4 gap-0">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                onClick={closeMobile}
                className="font-display text-[28px] text-surface border-b border-surface/20 py-6 hover:text-primary-fixed transition-colors"
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to={user?.role === 'SELLER' || user?.role === 'ADMIN' ? '/seller' : '/register?role=seller'}
              onClick={closeMobile}
              className="font-display text-[28px] text-surface border-b border-surface/20 py-6 hover:text-primary-fixed transition-colors"
            >
              Sell on Shoppyfy
            </NavLink>
          </nav>
          <div className="px-6 py-8 mt-auto border-t border-surface/20 flex flex-col gap-4">
            {user ? (
              <>
                <p className="text-surface/60 text-label-md uppercase">
                  {user.firstName} {user.lastName}
                </p>
                {[
                  { label: 'My Profile', to: '/profile' },
                  { label: 'My Orders', to: '/orders' },
                  { label: 'Wishlist', to: '/wishlist' },
                  ...(user.role === 'SELLER' || user.role === 'ADMIN'
                    ? [{ label: 'Seller Dashboard', to: '/seller' }]
                    : []),
                  ...(user.role === 'ADMIN' ? [{ label: 'Admin', to: '/admin' }] : []),
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobile}
                    className="text-surface text-label-md uppercase hover:text-primary-fixed transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-left text-error text-label-md uppercase"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMobile}
                className="inline-block text-label-md uppercase border border-surface text-surface px-6 py-3 text-center hover:bg-surface hover:text-on-surface transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
