import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/axios';
import { Category, Order, Product, money } from '../types';
import Spinner from '../components/Spinner';

interface SellerStats {
  productCount: number;
  activeCount: number;
  unitsSold: number;
  revenue: number;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  categoryId: string;
  sizes: string;
  colors: string;
  brand: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  stock: string;
  imageUrls: string;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  comparePrice: '',
  categoryId: '',
  sizes: '',
  colors: '',
  brand: '',
  condition: 'NEW',
  stock: '1',
  imageUrls: '',
};

type Tab = 'listings' | 'sales';

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('listings');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const [statsRes, productsRes, ordersRes, categoriesRes] = await Promise.all([
        api.get<{ stats: SellerStats }>('/seller/stats'),
        api.get<{ products: Product[] }>('/seller/products'),
        api.get<{ orders: Order[] }>('/seller/orders'),
        api.get<{ categories: Category[] }>('/categories'),
      ]);
      setStats(statsRes.data.stats);
      setProducts(productsRes.data.products);
      setOrders(ordersRes.data.orders);
      setCategories(categoriesRes.data.categories);
    } catch {
      /* surfaces via empty UI */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' });
    setEditingId(null);
    setFiles(null);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      categoryId: p.category.id,
      sizes: p.sizes.join(', '),
      colors: p.colors.join(', '),
      brand: p.brand ?? '',
      condition: p.condition,
      stock: String(p.stock),
      imageUrls: '',
    });
    setEditingId(p.id);
    setFiles(null);
    setMessage(null);
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('description', form.description);
      data.append('price', form.price);
      if (form.comparePrice) data.append('comparePrice', form.comparePrice);
      data.append('categoryId', form.categoryId);
      data.append('sizes', form.sizes);
      data.append('colors', form.colors);
      if (form.brand) data.append('brand', form.brand);
      data.append('condition', form.condition);
      data.append('stock', form.stock);
      if (form.imageUrls) data.append('imageUrls', form.imageUrls);
      if (files) Array.from(files).forEach((f) => data.append('images', f));

      if (editingId) {
        await api.patch(`/seller/products/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/seller/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    await api.delete(`/seller/products/${id}`).catch(() => undefined);
    load();
  };

  if (loading) return <Spinner label="Loading your atelier" />;

  const underlineInput =
    'w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:border-on-surface focus:ring-0 focus:outline-none text-body-md transition-colors';

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-12">
        <div>
          <span className="text-label-md text-primary uppercase tracking-widest mb-2 block">
            Seller Atelier
          </span>
          <h1 className="font-display text-headline-md">Your Dashboard</h1>
        </div>
        <button
          onClick={openCreate}
          className="bg-on-surface text-surface px-8 py-3 text-label-md uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Listing
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { label: 'Total Listings', value: stats.productCount },
            { label: 'Live Listings', value: stats.activeCount },
            { label: 'Units Sold', value: stats.unitsSold },
            { label: 'Revenue', value: money(stats.revenue) },
          ].map((s) => (
            <div key={s.label} className="border border-outline-variant p-6 bg-surface-container-lowest">
              <p className="text-label-md uppercase text-on-surface-variant mb-2">{s.label}</p>
              <p className="font-display text-headline-md">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="border border-outline-variant p-8 bg-surface-container-lowest mb-16 space-y-6">
          <h2 className="font-display text-headline-sm">
            {editingId ? 'Edit Listing' : 'Create New Listing'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase">Name</label>
              <input className={underlineInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase">Description</label>
              <textarea
                rows={3}
                className="w-full bg-transparent border border-outline-variant p-3 focus:border-on-surface focus:ring-0 focus:outline-none text-body-md"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Price (USD)</label>
              <input type="number" min="0" step="0.01" className={underlineInput} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Compare-at Price (optional)</label>
              <input type="number" min="0" step="0.01" className={underlineInput} value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Category</label>
              <select
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 text-body-md"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Condition</label>
              <select
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 text-body-md"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as ProductForm['condition'] })}
              >
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Sizes (comma-separated)</label>
              <input className={underlineInput} placeholder="XS, S, M, L" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Colors (comma-separated)</label>
              <input className={underlineInput} placeholder="Black, Ivory" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Brand</label>
              <input className={underlineInput} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant uppercase">Stock</label>
              <input type="number" min="0" className={underlineInput} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase">
                Images (uploaded to Cloudinary)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-body-sm py-2"
              />
              <input
                className={underlineInput}
                placeholder="…or paste image URLs, comma-separated"
                value={form.imageUrls}
                onChange={(e) => setForm({ ...form, imageUrls: e.target.value })}
              />
            </div>
          </div>
          {message && <p className="text-body-sm text-error">{message}</p>}
          <div className="flex gap-4 pt-2">
            <button
              onClick={submit}
              disabled={saving}
              className="bg-on-surface text-surface px-8 py-3 text-label-md uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Publish Listing'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 text-label-md uppercase text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-8">
        {(['listings', 'sales'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-4 text-label-md uppercase tracking-widest capitalize ${
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t === 'listings' ? `My Listings (${products.length})` : `Sales (${orders.length})`}
          </button>
        ))}
      </div>

      {tab === 'listings' ? (
        products.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-12 text-center">
            No listings yet — publish your first piece.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-md uppercase text-on-surface-variant">
                  <th className="py-4 pr-4">Product</th>
                  <th className="py-4 pr-4">Category</th>
                  <th className="py-4 pr-4">Price</th>
                  <th className="py-4 pr-4">Stock</th>
                  <th className="py-4 pr-4">Status</th>
                  <th className="py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-surface-container overflow-hidden flex-shrink-0">
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <Link to={`/products/${p.slug}`} className="font-semibold hover:text-primary">
                            {p.name}
                          </Link>
                          <p className="text-label-md text-on-surface-variant uppercase">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-body-sm">{p.category.name}</td>
                    <td className="py-4 pr-4 text-body-sm font-semibold">{money(p.price)}</td>
                    <td className="py-4 pr-4 text-body-sm">{p.stock}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`px-2 py-1 text-[10px] uppercase tracking-wider font-semibold ${
                          p.isActive
                            ? 'bg-primary-fixed text-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {p.isActive ? 'Live' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                          className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-primary"
                        >
                          edit
                        </button>
                        {p.isActive && (
                          <button
                            onClick={() => deactivate(p.id)}
                            aria-label="Deactivate"
                            className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-error"
                          >
                            visibility_off
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : orders.length === 0 ? (
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          No sales yet — they'll appear here once buyers check out.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-outline-variant p-6 bg-surface-container-lowest">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <p className="text-label-md uppercase text-on-surface-variant">
                    Order #{order.orderNumber}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="px-3 py-1 bg-primary-fixed text-primary text-[10px] uppercase tracking-wider font-semibold">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="divide-y divide-outline-variant">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.productName} className="w-10 h-14 object-cover" />
                      )}
                      <div>
                        <p className="font-semibold text-body-sm">{item.productName}</p>
                        <p className="text-label-md text-on-surface-variant">
                          {[item.color, item.size].filter(Boolean).join(' / ')} · Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{money(Number(item.price) * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
