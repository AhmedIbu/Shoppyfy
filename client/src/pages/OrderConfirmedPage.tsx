import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import { Order, money } from '../types';
import Spinner from '../components/Spinner';

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';

export default function OrderConfirmedPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ order: Order }>(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner label="Confirming your order" />;
  if (!order) {
    return (
      <main className="py-32 text-center">
        <h1 className="font-display text-headline-md mb-4">Order not found</h1>
        <Link to="/orders" className="text-label-md uppercase underline underline-offset-8">
          View my orders
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] flex flex-col items-center py-16 md:py-24 px-4 md:px-10">
      {/* Hero */}
      <section className="max-w-3xl w-full text-center mb-16">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-pill border border-primary flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg mb-4">
          Thank you for your order!
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
          Your payment was successful and your editorial selections are being prepared for
          shipment. A confirmation email has been sent to your inbox.
        </p>
      </section>

      <div className="max-w-container w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Details */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-container-low p-8 border border-outline-variant">
            <div className="grid grid-cols-2 gap-y-8">
              <div>
                <p className="text-label-md text-secondary uppercase mb-2">Order Number</p>
                <p className="font-display text-headline-sm">#{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-label-md text-secondary uppercase mb-2">Estimated Delivery</p>
                <p className="font-display text-headline-sm">{formatDate(order.estimatedDelivery)}</p>
              </div>
              <div className="col-span-2 pt-6 border-t border-outline-variant">
                <p className="text-label-md text-secondary uppercase mb-2">Shipping Address</p>
                <p className="text-body-md text-on-surface">
                  {order.shipFullName}
                  <br />
                  {order.shipLine1}
                  {order.shipLine2 && (
                    <>
                      , {order.shipLine2}
                    </>
                  )}
                  <br />
                  {order.shipCity}, {order.shipState} {order.shipPostalCode}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant overflow-hidden">
            <div className="p-8 border-b border-outline-variant">
              <h2 className="font-display text-headline-sm">Order Summary</h2>
            </div>
            <div className="divide-y divide-outline-variant">
              {order.items.map((item) => (
                <div key={item.id} className="p-8 flex gap-6 items-center">
                  <div className="w-24 h-32 bg-surface-variant flex-shrink-0 overflow-hidden">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-display text-headline-sm leading-tight">{item.productName}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {item.size && `Size: ${item.size}`}
                      {item.size && item.color && ' | '}
                      {item.color && `Color: ${item.color}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-lg text-on-surface font-semibold">{money(item.price)}</p>
                    <p className="text-label-md text-secondary">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment overview */}
        <div className="md:col-span-5 flex flex-col gap-8 sticky top-28">
          <div className="bg-on-surface text-surface p-8 border border-on-surface">
            <h3 className="font-display text-headline-sm mb-6">Payment Overview</h3>
            <div className="space-y-4 text-body-md">
              <div className="flex justify-between">
                <span className="text-surface-variant">Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-variant">Shipping</span>
                <span>{Number(order.shipping) === 0 ? 'Free' : money(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-variant">Tax</span>
                <span>{money(order.tax)}</span>
              </div>
              <div className="border-t border-surface-variant/30 pt-4 mt-4 flex justify-between items-baseline">
                <span className="font-display text-headline-sm">Total</span>
                <span className="font-display text-3xl font-bold">{money(order.total)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Link
              to={`/orders/${order.id}/track`}
              className="w-full h-16 bg-primary text-on-primary text-label-md uppercase tracking-widest hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center"
            >
              Track Order
            </Link>
            <Link
              to="/shop"
              className="w-full h-16 border border-on-surface text-on-surface text-label-md uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-all active:scale-[0.98] flex items-center justify-center"
            >
              Continue Shopping
            </Link>
          </div>
          <div className="text-center md:text-left mt-4">
            <p className="text-body-sm text-on-surface-variant mb-2">
              Need assistance with your order?
            </p>
            <span className="text-label-md uppercase text-primary hover:underline underline-offset-4 cursor-pointer">
              Contact Our Concierge
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
