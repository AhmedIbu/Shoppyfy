import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { Category, Product } from '../types';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=80';

const trust = [
  { icon: 'local_shipping', title: 'Fast Shipping', text: 'Global express delivery on all orders.' },
  { icon: 'verified_user', title: 'Secure Payments', text: 'Encrypted transactions and buyer protection.' },
  { icon: 'verified', title: 'Authenticity Guaranteed', text: 'Every piece is verified by our experts.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ products: Product[] }>('/products', { params: { featured: true, limit: 4 } }),
      api.get<{ categories: Category[] }>('/categories'),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data.products);
        setCategories(categoriesRes.data.categories);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const bento = categories.slice(0, 4);
  const spans = ['md:col-span-8', 'md:col-span-4', 'md:col-span-4', 'md:col-span-8'];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[640px] md:h-[870px] w-full overflow-hidden bg-on-surface">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Editorial fashion"
            className="w-full h-full object-cover opacity-80"
          />
        </div>
        <div className="relative z-10 h-full max-w-container mx-auto px-4 md:px-10 flex flex-col justify-center items-start text-surface">
          <h1 className="font-display font-bold text-display-lg-mobile md:text-[80px] leading-[1.1] mb-8 max-w-2xl">
            Curation <br /> Without <br /> Compromise.
          </h1>
          <div className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={() => navigate('/shop?sort=newest')}
              className="bg-surface text-on-surface px-10 py-5 text-label-md uppercase tracking-widest hover:bg-primary-container hover:text-surface transition-all duration-300"
            >
              Shop New Arrivals
            </button>
            <button
              onClick={() => navigate('/register?role=seller')}
              className="border border-surface text-surface px-10 py-5 text-label-md uppercase tracking-widest hover:bg-surface hover:text-on-surface transition-all duration-300"
            >
              Start Selling
            </button>
          </div>
        </div>
      </section>

      {/* Brand trust */}
      <section className="py-16 border-b border-outline-variant bg-surface">
        <div className="max-w-container mx-auto px-4 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {trust.map((item) => (
            <div key={item.title} className="flex items-center gap-4 py-4">
              <span className="material-symbols-outlined text-primary text-4xl">{item.icon}</span>
              <div>
                <h3 className="text-label-md uppercase text-on-surface">{item.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Curated categories — bento grid */}
      <section className="py-24 max-w-container mx-auto px-4 md:px-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-label-md text-primary uppercase tracking-widest mb-2 block">
              Departments
            </span>
            <h2 className="font-display text-headline-md">Curated Categories</h2>
          </div>
          <Link
            to="/shop"
            className="text-label-md uppercase underline underline-offset-8 hover:text-primary transition-colors"
          >
            View All Departments
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[800px]">
          {bento.map((category, i) => (
            <div
              key={category.id}
              className={`${spans[i]} group relative overflow-hidden bg-surface-container min-h-[280px] cursor-pointer`}
              onClick={() => navigate(`/shop?category=${category.slug}`)}
            >
              {category.imageUrl && (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-10">
                <h3 className="text-surface font-display text-headline-sm mb-4">{category.name}</h3>
                <span className="w-fit text-surface border-b border-surface pb-1 text-label-md uppercase group-hover:text-primary-fixed group-hover:border-primary-fixed transition-all">
                  Explore Collection
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="py-24 bg-surface-container-low overflow-hidden">
        <div className="max-w-container mx-auto px-4 md:px-10">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-label-md text-primary uppercase tracking-widest mb-2 block">
                Weekly Drop
              </span>
              <h2 className="font-display text-headline-md">Trending Now</h2>
            </div>
            <Link
              to="/shop"
              className="hidden sm:flex w-12 h-12 border border-outline items-center justify-center hover:bg-on-surface hover:text-surface transition-all"
              aria-label="View all products"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          {loading ? (
            <Spinner label="Loading the drop" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-32 bg-on-surface text-surface relative overflow-hidden">
        <div className="relative z-10 max-w-container mx-auto px-4 md:px-10 text-center">
          <span className="text-label-md text-primary-fixed uppercase tracking-[0.2em] mb-4 block">
            Inner Circle
          </span>
          <h2 className="font-display font-bold text-display-lg-mobile md:text-display-lg mb-8">
            Access the Archives
          </h2>
          <p className="text-body-lg text-surface-variant max-w-xl mx-auto mb-12">
            Join our newsletter for early access to editorial drops, exclusive designer interviews,
            and member-only pricing.
          </p>
          {subscribed ? (
            <p className="text-body-lg text-primary-fixed">You're in. Welcome to the inner circle.</p>
          ) : (
            <form
              className="flex flex-col md:flex-row gap-0 max-w-2xl mx-auto border-b border-surface-variant focus-within:border-primary-fixed transition-colors"
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubscribed(true);
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ENTER YOUR EMAIL ADDRESS"
                className="flex-1 bg-transparent border-none py-6 px-4 text-surface placeholder:text-surface-variant/50 focus:ring-0 focus:outline-none text-label-md"
              />
              <button
                type="submit"
                className="py-6 px-12 bg-surface text-on-surface text-label-md uppercase tracking-widest hover:bg-primary-container hover:text-surface transition-all"
              >
                Subscribe
              </button>
            </form>
          )}
          <p className="mt-8 text-body-sm text-surface-variant/70">
            By subscribing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </section>
    </>
  );
}
