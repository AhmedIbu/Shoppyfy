import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import { Order, money } from '../types';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt_long' },
  { key: 'processing', label: 'Processing', icon: 'package_2' },
  { key: 'shipped', label: 'Shipped', icon: 'local_shipping' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
] as const;

const statusToStep: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 1,
  SHIPPED: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
  CANCELLED: 0,
  REFUNDED: 0,
};

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ order: Order }>(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner label="Locating your package" />;
  if (!order) {
    return (
      <main className="py-32 text-center">
        <h1 className="font-display text-headline-md mb-4">Order not found</h1>
        <Link to="/orders" className="text-label-md uppercase underline underline-offset-8">
          Back to orders
        </Link>
      </main>
    );
  }

  const activeStep = statusToStep[order.status] ?? 0;
  const cancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const placedAt = new Date(order.createdAt);

  // Synthesized timeline from order milestones (newest first)
  const updates = [
    activeStep >= 3 && order.deliveredAt
      ? {
          title: 'Delivered',
          text: 'Your package was delivered. Enjoy your new pieces!',
          time: fmt(order.deliveredAt),
          place: `${order.shipCity}, ${order.shipState}`,
          active: true,
        }
      : null,
    activeStep >= 2
      ? {
          title: 'Package shipped',
          text: `Your order has been picked up by ${order.carrier ?? 'the carrier'}.`,
          time: fmt(new Date(placedAt.getTime() + 36 * 3600 * 1000)),
          place: 'Distribution Center',
          active: activeStep === 2,
        }
      : null,
    activeStep >= 1
      ? {
          title: 'Order processing',
          text: 'Payment confirmed. Your editorial selections are being prepared.',
          time: fmt(new Date(placedAt.getTime() + 4 * 3600 * 1000)),
          place: 'SEMMAI Atelier',
          active: activeStep === 1,
        }
      : null,
    {
      title: cancelled ? `Order ${order.status.toLowerCase()}` : 'Order placed',
      text: cancelled
        ? 'This order is no longer active.'
        : 'We received your order and sent a confirmation email.',
      time: fmt(order.createdAt),
      place: 'Online',
      active: activeStep === 0,
    },
  ].filter(Boolean) as { title: string; text: string; time: string; place: string; active: boolean }[];

  const copyTracking = () => {
    if (order.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 text-on-surface-variant text-label-md uppercase mb-4">
          <Link to="/profile" className="hover:text-primary">
            Account
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to="/orders" className="hover:text-primary">
            Order History
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Order #{order.orderNumber}</span>
        </div>
        <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Track Your Package
        </h1>
        <p className="text-body-md text-on-surface-variant">
          {order.status === 'DELIVERED'
            ? `Delivered ${order.deliveredAt ? fmt(order.deliveredAt) : ''}`
            : cancelled
              ? 'This order has been cancelled.'
              : `Estimated Delivery: ${
                  order.estimatedDelivery
                    ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'TBD'
                }`}
        </p>
      </div>

      {/* Stepper */}
      {!cancelled && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 md:p-12 mb-12">
          <div className="flex items-start justify-between w-full relative">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center z-10 flex-1 relative">
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 -translate-y-1/2 w-full h-[2px] ${
                      i <= activeStep ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                    style={{ width: 'calc(100% - 2rem)', right: 'calc(50% + 1rem)' }}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-pill flex items-center justify-center mb-4 z-10 ${
                    i < activeStep
                      ? 'bg-primary text-on-primary ring-4 ring-primary-fixed'
                      : i === activeStep
                        ? 'bg-primary text-on-primary ring-8 ring-primary-fixed animate-pulse'
                        : 'bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${i < activeStep ? 'filled' : ''}`}>
                    {i < activeStep ? 'check' : step.icon}
                  </span>
                </div>
                <span
                  className={`text-label-md uppercase text-center ${
                    i === activeStep
                      ? 'text-primary'
                      : i < activeStep
                        ? 'text-on-surface'
                        : 'text-on-surface-variant opacity-50'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Updates feed */}
        <section className="lg:col-span-2">
          <h2 className="font-display text-headline-sm text-on-surface mb-8">Latest Updates</h2>
          <div className="relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
            {updates.map((u, i) => (
              <div key={i} className={`relative pl-10 ${i < updates.length - 1 ? 'pb-10' : ''}`}>
                <div
                  className={`absolute left-0 top-1 w-6 h-6 rounded-pill flex items-center justify-center z-10 ring-4 ring-background ${
                    u.active ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-pill ${u.active ? 'bg-on-primary' : 'bg-background'}`} />
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div>
                    <h3 className="text-label-md uppercase text-on-surface">{u.title}</h3>
                    <p className="text-body-sm text-on-surface-variant mt-1">{u.text}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-on-surface">{u.time}</p>
                    <p className="text-[12px] text-on-surface-variant">{u.place}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-8">
          <div className="bg-surface border border-outline-variant p-6 rounded-xl">
            <h2 className="font-display text-[20px] font-semibold text-on-surface mb-6">
              Order Summary
            </h2>
            <div className="space-y-4 mb-8">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-surface-container-low shrink-0 overflow-hidden">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.productName} onError={onImgError} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-label-md uppercase text-on-surface">{item.productName}</h4>
                    <p className="text-[12px] text-on-surface-variant">
                      {[item.color, item.size].filter(Boolean).join(' / ')}
                    </p>
                    <p className="text-[12px] font-semibold text-on-surface mt-1">
                      {money(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-outline-variant pt-6 space-y-2">
              <div className="flex justify-between text-body-sm text-on-surface-variant">
                <span>Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-body-sm text-on-surface-variant">
                <span>Shipping</span>
                <span className={Number(order.shipping) === 0 ? 'text-primary font-bold' : ''}>
                  {Number(order.shipping) === 0 ? 'FREE' : money(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-body-sm text-on-surface-variant">
                <span>Tax</span>
                <span>{money(order.tax)}</span>
              </div>
              <div className="flex justify-between text-[16px] font-semibold text-on-surface pt-2">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-label-md text-on-surface uppercase tracking-widest mb-2">
                Shipping To
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {order.shipFullName}
                <br />
                {order.shipLine1}
                {order.shipLine2 && `, ${order.shipLine2}`}
                <br />
                {order.shipCity}, {order.shipState} {order.shipPostalCode}
              </p>
            </div>
            {order.trackingNumber && (
              <div className="pt-4 border-t border-outline-variant">
                <h3 className="text-label-md text-on-surface uppercase tracking-widest mb-2">
                  Tracking Number
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-body-md text-primary font-bold">
                    {order.carrier ? `${order.carrier} ` : ''}
                    {order.trackingNumber}
                  </p>
                  <button
                    onClick={copyTracking}
                    aria-label="Copy tracking number"
                    className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-on-surface"
                  >
                    {copied ? 'check' : 'content_copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            className="w-full py-4 bg-primary text-on-primary text-label-md uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95"
          >
            Help with Order
          </button>

          {/* Help modal */}
          {helpOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-surface border border-outline-variant p-8 max-w-sm w-full shadow-2xl">
                <h3 className="font-display text-headline-sm mb-4">Need help?</h3>
                <p className="text-body-sm text-on-surface-variant mb-1">
                  For issues with order <strong>#{order.orderNumber}</strong>, contact our support team:
                </p>
                <a
                  href={`mailto:support@semmai.com?subject=Help with order ${order.orderNumber}`}
                  className="text-primary underline underline-offset-4 text-body-sm"
                >
                  support@semmai.com
                </a>
                <p className="text-body-sm text-on-surface-variant mt-4">
                  Please include your order number and a brief description of the issue. We typically respond within 24 hours.
                </p>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="px-6 py-2 text-label-md uppercase border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
