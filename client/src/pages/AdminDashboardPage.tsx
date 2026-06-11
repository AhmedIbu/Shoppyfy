import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/axios';
import { Order, OrderStatus, money } from '../types';
import Spinner from '../components/Spinner';

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

type Tab = 'users' | 'orders';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        api.get<{ stats: AdminStats }>('/admin/stats'),
        api.get<{ users: AdminUser[] }>('/admin/users'),
        api.get<{ orders: Order[] }>('/admin/orders'),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setOrders(ordersRes.data.orders);
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

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/orders/${id}`, { status });
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Loading the control room" />;

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      <div className="mb-12">
        <span className="text-label-md text-primary uppercase tracking-widest mb-2 block">
          Administration
        </span>
        <h1 className="font-display text-headline-md">Marketplace Overview</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { label: 'Users', value: stats.userCount },
            { label: 'Live Products', value: stats.productCount },
            { label: 'Orders', value: stats.orderCount },
            { label: 'Revenue', value: money(stats.revenue) },
          ].map((s) => (
            <div key={s.label} className="border border-outline-variant p-6 bg-surface-container-lowest">
              <p className="text-label-md uppercase text-on-surface-variant mb-2">{s.label}</p>
              <p className="font-display text-headline-md">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-body-sm text-error mb-6">{message}</p>}

      <div className="flex border-b border-outline-variant mb-8">
        {(['orders', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-4 text-label-md uppercase tracking-widest capitalize ${
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t} ({t === 'orders' ? orders.length : users.length})
          </button>
        ))}
      </div>

      {tab === 'users' ? (
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
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="bg-transparent border border-outline-variant px-2 py-1 text-label-md uppercase focus:ring-0 cursor-pointer"
                    >
                      <option value="BUYER">Buyer</option>
                      <option value="SELLER">Seller</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
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
                const customer = (o as Order & { user?: { firstName: string; lastName: string } }).user;
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
    </main>
  );
}
