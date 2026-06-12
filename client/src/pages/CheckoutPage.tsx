import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { api, apiErrorMessage } from '../api/axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCart } from '../store/cartSlice';
import { Address, money } from '../types';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const FREE_SHIPPING_THRESHOLD = 250;
const SHIPPING_FLAT = 12;
const TAX_RATE = 0.08;

interface AddressForm {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const emptyAddress: AddressForm = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
};

function StepHeading({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span
        className={`w-8 h-8 rounded-pill flex items-center justify-center text-label-md ${
          done
            ? 'bg-primary text-on-primary'
            : active
              ? 'bg-on-surface text-surface'
              : 'border border-on-surface text-on-surface'
        }`}
      >
        {done ? <span className="material-symbols-outlined text-[18px]">check</span> : n}
      </span>
      <h2 className="font-display text-headline-sm uppercase tracking-wider">{label}</h2>
    </div>
  );
}

function PaymentStep({
  orderId,
  total,
  onBack,
}: {
  orderId: string;
  total: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/order-confirmed/${orderId}` },
    });

    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }

    try {
      await api.post(`/orders/${orderId}/confirm`);
    } catch {
      // Webhook may already have fulfilled the order — confirmation page will show status
    }
    dispatch(fetchCart());
    navigate(`/order-confirmed/${orderId}`);
  };

  return (
    <div className="space-y-8">
      <div className="border border-outline-variant p-8 bg-surface-container-lowest">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-label-md uppercase">Payment Details</p>
          <span className="material-symbols-outlined text-secondary">credit_card</span>
        </div>
        <PaymentElement />
        {error && <p className="mt-4 text-body-sm text-error">{error}</p>}
      </div>
      <div className="pt-2">
        <button
          onClick={handlePay}
          disabled={submitting || !stripe}
          className="w-full bg-primary-container text-on-primary px-12 py-6 text-label-md text-lg uppercase tracking-[0.2em] hover:bg-primary transition-all duration-500 shadow-xl disabled:opacity-60"
        >
          {submitting ? 'Processing…' : `Complete Purchase — ${money(total)}`}
        </button>
        <p className="text-center text-body-sm text-secondary mt-4 italic">
          By clicking 'Complete Purchase', you agree to Shoppyfy's Terms of Service and Privacy
          Policy.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-8 py-2 text-label-md uppercase tracking-widest text-secondary hover:text-on-surface transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, subtotal } = useAppSelector((s) => s.cart);

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [useNewAddress, setUseNewAddress] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const estShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const estTax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const estTotal = subtotal + estShipping + estTax;

  useEffect(() => {
    api
      .get<{ addresses: Address[] }>('/users/addresses')
      .then((res) => {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find((a) => a.isDefault) ?? res.data.addresses[0];
        if (def) setSelectedAddressId(def.id);
        else setUseNewAddress(true);
      })
      .catch(() => setUseNewAddress(true));
  }, []);

  const stripeOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              variables: {
                colorPrimary: '#3525cd',
                borderRadius: '2px',
                fontFamily: 'Inter, sans-serif',
              },
            },
          }
        : undefined,
    [clientSecret]
  );

  if (items.length === 0 && !clientSecret) {
    return (
      <main className="max-w-container mx-auto px-4 md:px-10 py-24 text-center">
        <h1 className="font-display text-headline-md mb-4">Your bag is empty</h1>
        <Link to="/shop" className="text-label-md uppercase underline underline-offset-8">
          Continue shopping
        </Link>
      </main>
    );
  }

  const continueToPayment = async () => {
    setError(null);
    setCreating(true);
    try {
      const payload =
        !useNewAddress && selectedAddressId
          ? { addressId: selectedAddressId }
          : { address: { ...form, line2: form.line2 || undefined, phone: form.phone || undefined }, saveAddress };
      const { data } = await api.post<{
        clientSecret: string;
        orderId: string;
        amount: number;
      }>('/checkout/create-payment-intent', payload);
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setTotal(data.amount);
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const formValid =
    !useNewAddress && selectedAddressId
      ? true
      : form.fullName && form.line1 && form.city && form.state && form.postalCode;

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-12">
      <div className="flex items-center gap-2 text-on-surface-variant mb-10 justify-end">
        <span className="material-symbols-outlined">lock</span>
        <span className="text-label-md uppercase">Secure Checkout</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Steps */}
        <div className="lg:col-span-7 space-y-12">
          {/* Step 1 — Shipping */}
          <section className={step !== 1 ? 'opacity-50' : ''}>
            <StepHeading n={1} label="Shipping Address" done={step > 1} active={step === 1} />
            {step === 1 && (
              <div className="space-y-6">
                {addresses.length > 0 && (
                  <div className="space-y-4">
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between p-6 border cursor-pointer transition-all ${
                          !useNewAddress && selectedAddressId === a.id
                            ? 'border-on-surface'
                            : 'border-outline-variant hover:border-on-surface'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="radio"
                            name="address"
                            checked={!useNewAddress && selectedAddressId === a.id}
                            onChange={() => {
                              setSelectedAddressId(a.id);
                              setUseNewAddress(false);
                            }}
                            className="text-primary focus:ring-primary h-4 w-4"
                          />
                          <div>
                            <p className="font-bold">
                              {a.label ?? 'Address'} {a.isDefault && <span className="text-label-md text-primary ml-2">DEFAULT</span>}
                            </p>
                            <p className="text-secondary text-body-sm">
                              {a.fullName} · {a.line1}
                              {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                    <label className="flex items-center gap-4 p-6 border border-outline-variant cursor-pointer hover:border-on-surface transition-all">
                      <input
                        type="radio"
                        name="address"
                        checked={useNewAddress}
                        onChange={() => setUseNewAddress(true)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <p className="font-bold">Ship to a new address</p>
                    </label>
                  </div>
                )}

                {(useNewAddress || addresses.length === 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(
                      [
                        ['fullName', 'Full Name', 'Jane Doe', 'md:col-span-2'],
                        ['line1', 'Street Address', '123 Fashion Ave', 'md:col-span-2'],
                        ['line2', 'Apt / Suite (optional)', 'Suite 400', 'md:col-span-2'],
                        ['city', 'City', 'New York', ''],
                        ['state', 'State', 'NY', ''],
                        ['postalCode', 'Zip Code', '10001', ''],
                        ['phone', 'Phone', '+1 212 555 0123', ''],
                      ] as const
                    ).map(([key, label, placeholder, span]) => (
                      <div key={key} className={span}>
                        <label className="block text-label-md uppercase mb-2 text-secondary">
                          {label}
                        </label>
                        <input
                          type="text"
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border-0 border-b border-outline-variant bg-transparent py-3 focus:border-primary focus:ring-0 focus:outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <label className="md:col-span-2 flex items-center gap-3 text-body-sm text-secondary">
                      <input
                        type="checkbox"
                        checked={saveAddress}
                        onChange={(e) => setSaveAddress(e.target.checked)}
                        className="rounded-none text-on-surface focus:ring-0"
                      />
                      Save this address to my account
                    </label>
                  </div>
                )}

                {error && <p className="text-body-sm text-error">{error}</p>}

                <div className="pt-4">
                  <button
                    onClick={continueToPayment}
                    disabled={!formValid || creating}
                    className="bg-on-surface text-surface px-12 py-4 text-label-md uppercase tracking-widest hover:bg-primary transition-all duration-300 disabled:opacity-50"
                  >
                    {creating ? 'Preparing payment…' : 'Continue to Payment'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Step 2 — Payment */}
          <section className={step !== 2 ? 'opacity-50' : ''}>
            <StepHeading n={2} label="Payment" done={false} active={step === 2} />
            {step === 2 &&
              (stripePromise && clientSecret && orderId ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <PaymentStep orderId={orderId} total={total} onBack={() => setStep(1)} />
                </Elements>
              ) : !stripePromise ? (
                <p className="text-body-md text-error">
                  Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in client/.env.
                </p>
              ) : (
                <Spinner label="Preparing secure payment" />
              ))}
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="sticky top-28 space-y-8">
            <div className="bg-surface-container-low p-8 border border-outline-variant">
              <h3 className="font-display text-headline-sm mb-8">Order Summary</h3>
              <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-28 bg-surface-container-high flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        onError={onImgError}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow flex flex-col justify-between py-1">
                      <div>
                        <p className="text-label-md uppercase">{item.product.brand}</p>
                        <h4 className="text-body-md font-bold">{item.product.name}</h4>
                        <p className="text-body-sm text-secondary">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && ' | '}
                          {item.color && `Color: ${item.color}`}
                          {' · '}Qty {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">
                        {money(Number(item.product.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4 pt-6 border-t border-outline-variant">
                <div className="flex justify-between text-body-md">
                  <span className="text-secondary">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-body-md">
                  <span className="text-secondary">Shipping</span>
                  <span>{estShipping === 0 ? 'Free' : money(estShipping)}</span>
                </div>
                <div className="flex justify-between text-body-md">
                  <span className="text-secondary">Estimated Tax</span>
                  <span>{money(estTax)}</span>
                </div>
                <div className="flex justify-between font-display text-headline-sm pt-4 border-t border-outline-variant">
                  <span>Total</span>
                  <span className="text-primary">{money(clientSecret ? total : estTotal)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 opacity-40 grayscale">
              <span className="material-symbols-outlined text-4xl">payments</span>
              <span className="material-symbols-outlined text-4xl">account_balance</span>
              <span className="material-symbols-outlined text-4xl">qr_code_2</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
