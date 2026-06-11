import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/axios';
import { Category, Pagination, Product } from '../types';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const category = params.get('category') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const page = Number(params.get('page') ?? 1);

  const [input, setInput] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    api
      .get<{ categories: Category[] }>('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => undefined);
    api
      .get<{ products: Product[] }>('/products', { params: { featured: true, limit: 4 } })
      .then((res) => setTrending(res.data.products))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setInput(query);
    if (!query) {
      setProducts([]);
      setPagination(null);
      return;
    }
    setLoading(true);
    api
      .get<{ products: Product[]; pagination: Pagination }>('/products', {
        params: {
          search: query,
          sort,
          category: category || undefined,
          maxPrice: maxPrice || undefined,
          page,
          limit: 12,
        },
      })
      .then((res) => {
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [query, sort, category, maxPrice, page]);

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-label-md uppercase text-on-surface-variant">
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface">Search Results</span>
      </nav>

      {/* Search bar */}
      <form
        className="mb-12 flex border-b-2 border-on-surface focus-within:border-primary transition-colors max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          setParam('q', input.trim() || null);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search curated fashion…"
          autoFocus
          className="flex-1 bg-transparent border-none py-4 px-0 text-body-lg focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/50"
        />
        <button type="submit" className="material-symbols-outlined px-4 hover:text-primary transition-colors">
          search
        </button>
      </form>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-outline-variant pb-8">
        <div>
          <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg mb-2">
            {query ? (
              <>
                Results for <span className="italic">"{query}"</span>
              </>
            ) : (
              'Search the curation'
            )}
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            {pagination
              ? `Showing ${(page - 1) * pagination.limit + 1}–${Math.min(
                  page * pagination.limit,
                  pagination.total
                )} of ${pagination.total} items`
              : 'Type to discover authenticated pieces'}
          </p>
        </div>
        {query && (
          <div className="flex items-center gap-4">
            <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
              Sort by
            </span>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="bg-transparent border-none text-label-md uppercase focus:ring-0 cursor-pointer pr-8"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {query && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Filters */}
          <aside className="md:col-span-3 space-y-10">
            <div>
              <h3 className="text-label-md text-on-surface uppercase tracking-widest mb-4">
                Categories
              </h3>
              <ul className="space-y-3 text-body-sm text-on-surface-variant">
                <li
                  className={`flex justify-between items-center cursor-pointer transition-colors hover:text-primary ${
                    !category ? 'text-primary font-semibold' : ''
                  }`}
                  onClick={() => setParam('category', null)}
                >
                  <span>All</span>
                </li>
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className={`flex justify-between items-center cursor-pointer transition-colors hover:text-primary ${
                      category === c.slug ? 'text-primary font-semibold' : ''
                    }`}
                    onClick={() => setParam('category', c.slug)}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded-pill">
                      {c.productCount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-label-md text-on-surface uppercase tracking-widest mb-4">
                Price Range
              </h3>
              <div className="px-2">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={maxPrice || 1000}
                  onChange={(e) =>
                    setParam('maxPrice', Number(e.target.value) >= 1000 ? null : e.target.value)
                  }
                  className="w-full h-1 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-2 text-label-md text-on-surface-variant">
                  <span>$0</span>
                  <span>{maxPrice ? `$${maxPrice}` : '$1000+'}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="md:col-span-9">
            {loading ? (
              <Spinner label="Searching the archives" />
            ) : products.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-display text-headline-sm mb-2">No results for "{query}"</p>
                <p className="text-body-md text-on-surface-variant">
                  Try a different search term or explore the trending pieces below.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-20 flex justify-center items-center gap-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setParam('page', String(page - 1))}
                  className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                >
                  arrow_back_ios
                </button>
                <div className="flex items-center gap-4">
                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setParam('page', String(i + 1))}
                      className={`w-10 h-10 flex items-center justify-center text-label-md transition-colors ${
                        page === i + 1
                          ? 'bg-on-surface text-surface'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setParam('page', String(page + 1))}
                  className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                >
                  arrow_forward_ios
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trending */}
      <section className="mt-32 pt-20 border-t border-outline-variant">
        <h2 className="font-display text-headline-md mb-12 text-center">Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trending.map((p) => (
            <Link key={p.id} to={`/products/${p.slug}`} className="group cursor-pointer">
              <div className="aspect-[4/5] overflow-hidden mb-4 bg-surface-container">
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-label-md uppercase tracking-wider text-on-surface-variant">
                {p.category.name}
              </h4>
              <p className="text-body-md">{p.name}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
