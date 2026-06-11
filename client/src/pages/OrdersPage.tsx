import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { Order, OrderStatus, money } from '../types';
import AccountSidebar from '../components/AccountSidebar';
import Spinner from '../components/Spinner';

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  PAID: 'bg-primary-fixed text-primary',
  PROCESSING: 'bg-primary-fixed text-primary',
  SHIPPED: 'bg-primary-container text-on-primary-container',
  OUT_FOR_DELIVERY: 'bg-primary-container text-on-primary-container',
  DELIVERED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error-container text-on-error-container',
  REFUNDED: 'bg-error-container text-on-error-container',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ALL');

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/orders')
      .then((res) => setOrders(res.data.orders))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const visible = orders.filter((order) => {
    if (filter === 'ALL') return true;
    if (filter === 'DELIVERED') return order.status === 'DELIVERED';
    return !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  });

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16 min-h-screen">
      <div className="flex flex-col md:flex-row gap-12">
        <AccountSidebar />

        <section className="flex-1">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-12">
            <div>
              <h1 className="font-display text-headline-md mb-2">Order History</h1>
              <p className="text-body-md text-on-surface-variant">
                Manage your recent purchases and track shipments.
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-label-md uppercase px-4 py-2 border border-outline bg-transparent focus:ring-0 cursor-pointer"
            >
              <option value="ALL">All Orders</option>
              <option value="ACTIVE">In Progress</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>

          {loading ? (
            <Spinner label="Loading your orders" />
          ) : visible.length === 0 ? (
            <div className="py-24 text-center border border-outline-variant">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4 block">
                package_2
              </span>
              <p className="font-display text-headline-sm mb-2">No orders yet</p>
              <Link to="/shop" className="text-label-md uppercase underline underline-offset-8">
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {visible.map((order) => {
                const first = order.items[0];
                const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <div
                    key={order.id}
                    className="group bg-surface-container-lowest border border-outline-variant overflow-hidden hover:border-primary transition-colors duration-300"
                  >
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                      <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-low overflow-hidden flex-shrink-0">
                        {first?.imageUrl && (
                          <img
                            src={first.imageUrl}
                            alt={first.productName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                            <div>
                              <p className="text-label-md text-on-surface-variant mb-1 uppercase tracking-widest">
                                Order #{order.orderNumber}
                              </p>
                              <h3 className="font-display text-headline-sm">
                                {first?.productName}
                                {order.items.length > 1 && ` (+${order.items.length - 1} items)`}
                              </h3>
                            </div>
                            <span
                              className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold ${statusStyles[order.status]}`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-6 border-y border-outline-variant">
                            <div>
                              <p className="text-label-md text-on-surface-variant uppercase mb-1">Date</p>
                              <p className="text-body-md">{formatDate(order.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-label-md text-on-surface-variant uppercase mb-1">Total</p>
                              <p className="text-body-md font-bold">{money(order.total)}</p>
                            </div>
                            <div className="hidden md:block">
                              <p className="text-label-md text-on-surface-variant uppercase mb-1">Items</p>
                              <p className="text-body-md">
                                {itemCount} Product{itemCount === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-4">
                          <Link
                            to={`/orders/${order.id}/track`}
                            className="bg-on-surface text-surface text-label-md uppercase px-8 py-3 hover:bg-primary transition-all active:scale-95"
                          >
                            Track Order
                          </Link>
                          <Link
                            to={`/order-confirmed/${order.id}`}
                            className="border border-on-surface text-on-surface text-label-md uppercase px-8 py-3 hover:bg-surface-container transition-all"
                          >
                            Order Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
