import { Link } from 'react-router-dom';

const columns = [
  {
    heading: 'Explore',
    links: [
      { label: 'New Arrivals', to: '/shop?sort=newest' },
      { label: 'Designers', to: '/shop' },
      { label: 'Sell on SEMMAI', to: '/register?role=seller' },
      { label: 'Sustainable Fashion', to: '/shop?condition=LIKE_NEW' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'About Us', to: '/' },
      { label: 'Shipping', to: '/' },
      { label: 'Returns', to: '/' },
      { label: 'Contact', to: '/' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/' },
      { label: 'Terms of Service', to: '/' },
      { label: 'Cookie Policy', to: '/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-on-surface border-t border-on-surface py-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 md:px-10 max-w-container mx-auto text-surface">
        <div className="flex flex-col gap-8">
          <Link to="/" className="font-display text-[32px] font-bold text-gold tracking-[4px] uppercase">
            SEMMAI
          </Link>
          <p className="text-body-sm text-surface-variant">
            Refined Essentials — luxury fashion, thoughtfully curated.
          </p>
          <div className="flex gap-4">
            <span className="material-symbols-outlined cursor-pointer hover:text-inverse-primary transition-colors">public</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-inverse-primary transition-colors">share</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-inverse-primary transition-colors">photo_camera</span>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.heading}>
            <h4 className="text-label-md uppercase text-surface mb-6">{col.heading}</h4>
            <ul className="flex flex-col gap-4 text-body-sm text-surface-variant">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="hover:text-inverse-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-20 pt-8 border-t border-surface-variant/30 px-4 md:px-10 max-w-container mx-auto text-center">
        <p className="text-body-sm text-surface-variant">
          © {new Date().getFullYear()} SEMMAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
