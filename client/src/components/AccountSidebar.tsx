import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

const links = [
  { to: '/', icon: 'home', label: 'Home', exact: true },
  { to: '/orders', icon: 'shopping_bag', label: 'My Orders' },
  { to: '/wishlist', icon: 'favorite', label: 'Wishlist' },
  { to: '/seller', icon: 'sell', label: 'Selling', sellerOnly: true },
  { to: '/profile', icon: 'person', label: 'Profile Settings' },
];

export default function AccountSidebar() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <aside className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
      <div className="mb-8">
        <h2 className="font-display font-bold text-display-lg-mobile text-on-surface">Account</h2>
        <p className="text-body-sm text-on-surface-variant">Editorial Fashion Hub</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links
          .filter((link) => !link.sellerOnly || user?.role === 'SELLER' || user?.role === 'ADMIN')
          .map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-4 text-primary font-bold bg-surface-container-low rounded-xl p-3 translate-x-1'
                  : 'flex items-center gap-4 text-on-surface-variant p-3 hover:bg-surface-container transition-all'
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                    {link.icon}
                  </span>
                  <span className="text-label-md uppercase">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
