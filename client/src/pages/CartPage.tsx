import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeCartItem, updateCartItem } from '../store/cartSlice';
import { money } from '../types';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

const FREE_SHIPPING_THRESHOLD = 250;
const SHIPPING_FLAT = 12;
const TAX_RATE = 0.08;

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { cart, subtotal, itemCount, loading } = useAppSelector((s) => s.cart);

  if (!cart && loading) return <Spinner label="Loading your bag" />;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <main className="max-w-container mx-auto px-4 md:px-10 py-16">
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
          <span className="material-symbols-outlined text-[64px] text-outline-variant">
            shopping_bag
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-display-lg-mobile md:text-display-lg">
              Your bag is empty
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              It looks like you haven't added anything to your cart yet. Discover our latest
              collections and find something you love.
            </p>
          </div>
          <Link
            to="/shop"
            className="mt-4 px-12 py-4 bg-primary text-on-primary text-label-md uppercase hover:bg-primary-container transition-all duration-300"
          >
            Start Shopping
          </Link>
        </div>
      </main>
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-outline-variant pb-8">
          <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg">
            Shopping Bag
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {itemCount} item{itemCount === 1 ? '' : 's'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Items */}
          <div className="lg:col-span-8 flex flex-col divide-y divide-outline-variant">
            {items.map((item) => (
              <div key={item.id} className="py-8 flex gap-6 group">
                <Link
                  to={`/products/${item.product.slug}`}
                  className="w-32 md:w-48 overflow-hidden bg-surface-container flex-shrink-0"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    onError={onImgError}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <Link to={`/products/${item.product.slug}`}>
                        <h3 className="font-display text-headline-sm hover:text-primary transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-body-sm text-on-surface-variant">
                        {[item.color, item.size].filter(Boolean).join(' / ') || '—'}
                      </p>
                      {item.product.brand && (
                        <p className="text-label-md uppercase text-on-surface-variant">
                          {item.product.brand}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => dispatch(removeCartItem(item.id))}
                      aria-label="Remove item"
                      className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors"
                    >
                      close
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center border border-outline-variant">
                      <button
                        onClick={() =>
                          item.quantity > 1 &&
                          dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity - 1 }))
                        }
                        className="px-3 py-2 hover:bg-surface-container-low transition-colors disabled:opacity-30"
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="px-4 text-label-md">{item.quantity}</span>
                      <button
                        onClick={() =>
                          dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity + 1 }))
                        }
                        className="px-3 py-2 hover:bg-surface-container-low transition-colors disabled:opacity-30"
                        disabled={item.quantity >= item.product.stock}
                        aria-label="Increase quantity"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                    <p className="font-display text-headline-sm">
                      {money(Number(item.product.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-4">
            <div className="bg-surface border border-outline-variant p-8 flex flex-col gap-8 sticky top-24">
              <h2 className="font-display text-headline-sm">Order Summary</h2>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-body-md text-on-surface-variant">Subtotal</span>
                  <span className="text-body-md">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-md text-on-surface-variant">Estimated Shipping</span>
                  <span className="text-body-md">{shipping === 0 ? 'Free' : money(shipping)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-md text-on-surface-variant">Tax</span>
                  <span className="text-body-md">{money(tax)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-body-sm text-on-surface-variant">
                    Spend {money(FREE_SHIPPING_THRESHOLD - subtotal)} more for complimentary
                    shipping.
                  </p>
                )}
              </div>
              <div className="border-t border-outline-variant pt-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="promo"
                    className="text-label-md uppercase tracking-wider text-on-surface-variant"
                  >
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo"
                      type="text"
                      placeholder="Enter code"
                      className="flex-1 bg-surface border-0 border-b border-outline focus:border-on-surface focus:ring-0 focus:outline-none p-2 text-body-sm transition-all"
                    />
                    <button className="px-4 py-2 border border-on-surface text-label-md uppercase hover:bg-surface-container transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-display text-headline-sm">Total</span>
                  <span className="font-display text-headline-md">{money(total)}</span>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-primary text-on-primary py-5 text-label-md uppercase hover:bg-primary-container transition-all duration-300 active:scale-[0.98]"
                >
                  Proceed to Checkout
                </button>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    lock
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    Secure Checkout Powered by Razorpay
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
