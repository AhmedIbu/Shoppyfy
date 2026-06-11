import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/axios';
import { Category, Pagination, Product } from '../types';
import ProductCard from '../components/ProductCard';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];
const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
];

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="aspect-[3/4] bg-surface-container w-full" />
      <div className="h-4 bg-surface-container w-3/4" />
      <div className="h-4 bg-surface-container w-1/4" />
    </div>
  );
}

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);

  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const sizes = params.get('sizes') ?? '';
  const condition = params.get('condition') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const page = Number(params.get('page') ?? 1);

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
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ products: Product[]; pagination: Pagination }>('/products', {
        params: {
          category: category || undefined,
          sort,
          sizes: sizes || undefined,
          condition: condition || undefined,
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
  }, [category, sort, sizes, condition, maxPrice, page]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === category),
    [categories, category]
  );

  const selectedSizes = sizes ? sizes.split(',') : [];
  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    setParam('sizes', next.join(',') || null);
  };

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-10">
          <div>
            <h3 className="text-label-md text-on-surface-variant uppercase mb-4 tracking-widest">
              Category
            </h3>
            <ul className="space-y-3">
              <li
                className={`flex items-center justify-between cursor-pointer group ${
                  !category ? 'text-primary font-semibold' : 'text-on-surface'
                }`}
                onClick={() => setParam('category', null)}
              >
                <span className="text-body-md group-hover:text-primary transition-colors">
                  All Pieces
                </span>
              </li>
              {categories.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between cursor-pointer group ${
                    category === c.slug ? 'text-primary font-semibold' : 'text-on-surface'
                  }`}
                  onClick={() => setParam('category', c.slug)}
                >
                  <span className="text-body-md group-hover:text-primary transition-colors">
                    {c.name}
                  </span>
                  <span className="text-label-md text-on-surface-variant">{c.productCount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label-md text-on-surface-variant uppercase mb-4 tracking-widest">
              Size
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`border py-2 text-label-md transition-all ${
                    selectedSizes.includes(size)
                      ? 'border-on-surface bg-on-surface text-surface'
                      : 'border-outline-variant hover:border-on-surface'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-label-md text-on-surface-variant uppercase mb-4 tracking-widest">
              Price Range
            </h3>
            <div className="space-y-4">
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={maxPrice || 1000}
                onChange={(e) =>
                  setParam('maxPrice', Number(e.target.value) >= 1000 ? null : e.target.value)
                }
                className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-on-surface"
              />
              <div className="flex justify-between items-center text-label-md text-on-surface">
                <span>$0</span>
                <span>{maxPrice ? `$${maxPrice}` : '$1,000+'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-label-md text-on-surface-variant uppercase mb-4 tracking-widest">
              Condition
            </h3>
            <div className="space-y-2">
              {CONDITIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={condition === c.value}
                    onChange={() => setParam('condition', condition === c.value ? null : c.value)}
                    className="rounded-none border-outline-variant text-on-surface focus:ring-0"
                  />
                  <span className="text-body-md group-hover:text-primary">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <section className="flex-grow">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-outline-variant gap-4">
            <div>
              <h1 className="font-display text-headline-md mb-1">
                {activeCategory?.name ?? 'All Pieces'}
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                {pagination ? `Curation of ${pagination.total} artisanal pieces` : 'Loading curation…'}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 text-label-md uppercase bg-surface-container-lowest border border-outline-variant px-4 py-2 hover:border-on-surface transition-all"
              >
                Sort by: {SORTS.find((s) => s.value === sort)?.label}
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container-lowest shadow-lg border border-outline-variant z-10">
                  <ul className="py-2">
                    {SORTS.map((s) => (
                      <li
                        key={s.value}
                        className="px-4 py-2 hover:bg-surface-container cursor-pointer text-label-md"
                        onClick={() => {
                          setParam('sort', s.value);
                          setSortOpen(false);
                        }}
                      >
                        {s.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-headline-sm mb-2">Nothing here yet</p>
              <p className="text-body-md text-on-surface-variant">
                Try adjusting your filters to discover more pieces.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-20 flex justify-center items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="material-symbols-outlined p-2 border border-outline-variant hover:border-on-surface transition-all disabled:opacity-30"
              >
                chevron_left
              </button>
              {Array.from({ length: pagination.totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setParam('page', String(i + 1))}
                  className={`w-10 h-10 flex items-center justify-center text-label-md border transition-all ${
                    page === i + 1
                      ? 'border-on-surface bg-on-surface text-surface'
                      : 'border-outline-variant text-on-surface hover:border-on-surface'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="material-symbols-outlined p-2 border border-outline-variant hover:border-on-surface transition-all disabled:opacity-30"
              >
                chevron_right
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
