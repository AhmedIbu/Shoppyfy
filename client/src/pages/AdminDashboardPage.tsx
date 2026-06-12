import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../api/axios';
import { Order, OrderStatus, money } from '../types';

interface AdminStats {
  userCount: number;
  productCount: number;
  orderCount: number;
  revenue: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  createdAt: string;
  _count: { orders: number; products: number };
}

interface AdminProduct {
  id: string;
  name: string;
  images: string[];
  isActive: boolean;
  price: string | number;
  category: { name: string };
  seller: { firstName: string; lastName: string };
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

type Tab = 'orders' | 'users' | 'products';

// ── Stats skeleton ──────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-outline-variant p-6">
          <div className="h-3 skeleton w-1/2 mb-3" />
          <div className="h-8 skeleton w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');
  const [message, setMessage] = useState<string | null>(null);

  // ── Image editor state ──────────────────────────────
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImgUrl, setNewImgUrl] = useState('');
  const [imgSaving, setImgSaving] = useState(false);
  const newImgRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [statsRes, usersRes, ordersRes, productsRes] = await Promise.all([
        api.get<{ stats: AdminStats }>('/admin/stats'),
        api.get<{ users: AdminUser[] }>('/admin/users'),
        api.get<{ orders: Order[] }>('/admin/orders'),
        api.get<{ products: AdminProduct[] }>('/admin/products'),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setOrders(ordersRes.data.orders);
      setProducts(productsRes.data.products);
    } catch (err) {
      setMessage(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (id: string, role: string) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (
      !window.confirm(
        `Delete account for ${email}? Orders are preserved but personal data is removed.`
      )
    )
      return;
    try {
      await api.delete(`/admin/users/${id}`);
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/orders/${id}`, { status });
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    }
  };

  // ── Image editor ─────────────────────────────────────
  const openImageEditor = (product: AdminProduct) => {
    setEditProduct(product);
    setEditImages([...product.images]);
    setNewImgUrl('');
  };

  const addImage = () => {
    const url = newImgUrl.trim();
    if (!url) return;
    setEditImages((prev) => [...prev, url]);
    setNewImgUrl('');
    newImgRef.current?.focus();
  };

  const removeImage = (idx: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveImages = async () => {
    if (!editProduct) return;
    if (editImages.length === 0) {
      setMessage('A product must have at least one image.');
      return;
    }
    setImgSaving(true);
    try {
      await api.patch(`/admin/products/${editProduct.id}`, { images: editImages });
      setProducts((prev) =>
        prev.map((p) => (p.id === editProduct.id ? { ...p, images: editImages } : p))
      );
      setEditProduct(null);
    } catch (err) {
      setMessage(apiErrorMessage(err));
    } finally {
      setImgSaving(false);
    }
  };

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      <div className="mb-12">
        <span className="text-label-md text-primary uppercase tracking-widest mb-2 block">
          Administration
        </span>
        <h1 className="font-display text-headline-md">Marketplace Overview</h1>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { label: 'Users', value: stats.userCount },
              { label: 'Live Products', value: stats.productCount },
              { label: 'Orders', value: stats.orderCount },
              { label: 'Revenue', value: money(stats.revenue) },
            ].map((s) => (
              <div
                key={s.label}
                className="border border-outline-variant p-6 bg-surface-container-lowest"
              >
                <p className="text-label-md uppercase text-on-surface-variant mb-2">{s.label}</p>
                <p className="font-display text-headline-md">{s.value}</p>
              </div>
            ))}
          </div>
        )
      )}

      {message && <p className="text-body-sm text-error mb-6">{message}</p>}

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-8">
        {(['orders', 'users', 'products'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-4 text-label-md uppercase tracking-widest capitalize ${
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t} (
            {t === 'orders' ? orders.length : t === 'users' ? users.length : products.length})
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-md uppercase text-on-surface-variant">
                <th className="py-4 pr-4">User</th>
                <th className="py-4 pr-4">Email</th>
                <th className="py-4 pr-4">Orders</th>
                <th className="py-4 pr-4">Listings</th>
                <th className="py-4">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-4 pr-4 font-semibold">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="py-4 pr-4 text-body-sm text-on-surface-variant">{u.email}</td>
                  <td className="py-4 pr-4 text-body-sm">{u._count.orders}</td>
                  <td className="py-4 pr-4 text-body-sm">{u._count.products}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="bg-transparent border border-outline-variant px-2 py-1 text-label-md uppercase focus:ring-0 cursor-pointer"
                      >
                        <option value="BUYER">Buyer</option>
                        <option value="SELLER">Seller</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        aria-label="Delete user"
                        title="Delete account"
                        className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors"
                      >
                        delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-md uppercase text-on-surface-variant">
                <th className="py-4 pr-4">Order</th>
                <th className="py-4 pr-4">Customer</th>
                <th className="py-4 pr-4">Date</th>
                <th className="py-4 pr-4">Total</th>
                <th className="py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {orders.map((o) => {
                const customer = (o as Order & { user?: { firstName: string; lastName: string } })
                  .user;
                return (
                  <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 pr-4 font-semibold">#{o.orderNumber}</td>
                    <td className="py-4 pr-4 text-body-sm">
                      {customer ? `${customer.firstName} ${customer.lastName}` : '—'}
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-on-surface-variant">
                      {new Date(o.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 pr-4 font-semibold">{money(o.total)}</td>
                    <td className="py-4">
                      <select
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className="bg-transparent border border-outline-variant px-2 py-1 text-label-md uppercase focus:ring-0 cursor-pointer"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Products tab ── */}
      {tab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className={`group relative border border-outline-variant bg-surface-container-lowest overflow-hidden ${
                !p.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Product image with pencil overlay */}
              <div className="relative aspect-[3/4] bg-surface-container">
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=400&q=60';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
                {/* Pencil overlay */}
                <button
                  onClick={() => openImageEditor(p)}
                  className="absolute inset-0 bg-on-surface/0 group-hover:bg-on-surface/40 transition-all duration-300 flex items-center justify-center"
                  aria-label="Edit images"
                >
                  <span className="material-symbols-outlined text-3xl text-on-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary rounded-full p-2">
                    edit
                  </span>
                </button>
                {/* Image count badge */}
                <span className="absolute top-2 right-2 bg-on-surface/70 text-on-primary text-label-md px-2 py-0.5 rounded-sm">
                  {p.images.length} img
                </span>
              </div>
              <div className="p-4">
                <p className="text-body-sm font-semibold text-on-surface truncate">{p.name}</p>
                <p className="text-label-md text-on-surface-variant mt-0.5">
                  {p.category.name} · {money(p.price)}
                </p>
                <p className="text-label-md text-on-surface-variant/70 truncate">
                  by {p.seller.firstName} {p.seller.lastName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Image edit modal ── */}
      {editProduct && (
        <div
          className="fixed inset-0 bg-on-surface/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditProduct(null)}
        >
          <div className="bg-surface-container-lowest w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
              <div>
                <p className="text-label-md uppercase text-primary tracking-widest mb-0.5">
                  Edit Images
                </p>
                <h3 className="font-display text-headline-sm text-on-surface">{editProduct.name}</h3>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
              >
                close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Current images */}
              {editImages.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant/60 text-center py-4">
                  No images yet. Add one below.
                </p>
              ) : (
                <div className="space-y-3">
                  {editImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 border border-outline-variant p-2"
                    >
                      <img
                        src={url}
                        alt={`Image ${idx + 1}`}
                        className="w-16 h-16 object-cover flex-shrink-0 bg-surface-container"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=100&q=60';
                        }}
                      />
                      <span className="flex-1 text-body-sm text-on-surface-variant truncate min-w-0">
                        {url}
                      </span>
                      <button
                        onClick={() => removeImage(idx)}
                        className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                        aria-label="Remove image"
                      >
                        delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new image URL */}
              <div className="flex gap-2 pt-2">
                <input
                  ref={newImgRef}
                  type="url"
                  value={newImgUrl}
                  onChange={(e) => setNewImgUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 border border-outline-variant px-3 py-2 text-body-sm bg-transparent focus:ring-0 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={addImage}
                  disabled={!newImgUrl.trim()}
                  className="px-4 py-2 bg-primary text-on-primary text-label-md uppercase tracking-wide hover:bg-primary-container transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-outline-variant">
              <button
                onClick={() => setEditProduct(null)}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant text-label-md uppercase tracking-widest hover:border-on-surface hover:text-on-surface transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveImages}
                disabled={imgSaving || editImages.length === 0}
                className="flex-1 py-3 bg-primary text-on-primary text-label-md uppercase tracking-widest hover:bg-primary-container transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {imgSaving ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                ) : (
                  'Save Images'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
