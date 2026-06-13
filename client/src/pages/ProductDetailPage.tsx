import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/axios';
import { Product, money } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../store/wishlistSlice';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

type Tab = 'details' | 'reviews' | 'shipping';

function Stars({ rating, size = 'text-sm' }: { rating: number; size?: string }) {
  return (
    <div className="flex text-primary">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${size} ${rating >= i - 0.25 ? 'filled' : ''}`}
        >
          {rating >= i - 0.25 ? 'star' : rating >= i - 0.75 ? 'star_half' : 'star'}
        </span>
      ))}
    </div>
  );
}

const conditionLabel: Record<string, string> = {
  NEW: 'New Arrival',
  LIKE_NEW: 'Like New',
  GOOD: 'Pre-Loved · Good',
  FAIR: 'Pre-Loved · Fair',
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const wishlistItems = useAppSelector((s) => s.wishlist.items);

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('details');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ product: Product; related: Product[] }>(`/products/${slug}`)
      .then((res) => {
        setProduct(res.data.product);
        setRelated(res.data.related);
        setImageIndex(0);
        setSize(res.data.product.sizes[0] ?? null);
        setColor(res.data.product.colors[0] ?? null);
        setQty(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner label="Loading the piece" />;
  if (!product) {
    return (
      <div className="py-32 text-center">
        <h1 className="font-display text-headline-md mb-4">Piece not found</h1>
        <Link to="/shop" className="text-label-md uppercase underline underline-offset-8">
          Back to the curation
        </Link>
      </div>
    );
  }

  const wishlisted = selectIsWishlisted(wishlistItems, product.id);
  const inStock = product.stock > 0;

  // Gallery follows the selected colour when that colour has its own images,
  // otherwise falls back to the full product gallery.
  const gallery =
    color && product.colorImages?.[color]?.length ? product.colorImages[color] : product.images;
  const activeImage = gallery[Math.min(imageIndex, gallery.length - 1)] ?? gallery[0];

  const requireAuth = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleAddToBag = async () => {
    if (!requireAuth()) return;
    setFeedback(null);
    try {
      await dispatch(
        addToCart({ productId: product.id, quantity: qty, size: size ?? undefined, color: color ?? undefined })
      ).unwrap();
      setFeedback('Added to your bag.');
    } catch (err) {
      setFeedback(apiErrorMessage(err));
    }
  };

  const handleBuyNow = async () => {
    if (!requireAuth()) return;
    try {
      await dispatch(
        addToCart({ productId: product.id, quantity: qty, size: size ?? undefined, color: color ?? undefined })
      ).unwrap();
      navigate('/checkout');
    } catch (err) {
      setFeedback(apiErrorMessage(err));
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    try {
      await api.post(`/products/${product.id}/reviews`, {
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment || undefined,
      });
      setReviewMessage('Thank you — your review has been published.');
      const { data } = await api.get<{ product: Product; related: Product[] }>(
        `/products/${slug}`
      );
      setProduct(data.product);
      setReviewTitle('');
      setReviewComment('');
    } catch (err) {
      setReviewMessage(apiErrorMessage(err));
    }
  };

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gallery */}
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
          <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto hide-scrollbar md:w-24">
            {gallery.map((image, i) => (
              <button
                key={`${image}-${i}`}
                onClick={() => setImageIndex(i)}
                className={`flex-shrink-0 w-20 h-24 overflow-hidden transition-colors ${
                  i === Math.min(imageIndex, gallery.length - 1)
                    ? 'border-2 border-primary'
                    : 'border border-outline-variant hover:border-primary'
                }`}
              >
                <img src={image} alt={`${product.name} view ${i + 1}`} onError={onImgError} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="order-1 md:order-2 flex-grow aspect-[4/5] bg-surface-container overflow-hidden group relative">
            <img
              src={activeImage}
              alt={product.name}
              onError={onImgError}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4">
              <span className="bg-brand-green text-white text-[10px] px-3 py-1 uppercase tracking-widest">
                {conditionLabel[product.condition]}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="space-y-4">
            {product.brand && (
              <span className="inter text-[10px] tracking-[1px] uppercase text-muted">
                {product.brand}
              </span>
            )}
            <h1 className="font-display font-semibold text-headline-md lg:text-[44px] lg:leading-[52px] text-on-surface">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="inter text-[9px] text-on-primary font-medium">
                  {product.seller.firstName[0]}
                  {product.seller.lastName[0]}
                </span>
              </div>
              <span className="inter text-[12px] text-muted">
                Sold by{' '}
                <span className="text-primary border-b border-divider cursor-pointer">
                  {product.seller.firstName} {product.seller.lastName}
                </span>{' '}
                · Verified seller ·{' '}
                <span className="material-symbols-outlined filled text-[12px] text-primary align-middle">
                  star
                </span>{' '}
                {(product.avgRating ?? 0).toFixed(1)}
              </span>
            </div>
            <div className="flex items-end gap-4">
              <p className="font-display text-headline-sm text-on-surface">{money(product.price)}</p>
              {product.comparePrice && (
                <p className="text-body-md text-on-surface-variant line-through pb-1">
                  {money(product.comparePrice)}
                </p>
              )}
              <div className="flex items-center gap-1 pb-1">
                <Stars rating={product.avgRating ?? 0} />
                <span className="text-label-md text-on-surface-variant">
                  ({product.reviewCount ?? 0} Reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Selectors */}
          <div className="space-y-6">
            {product.colors.length > 0 && (
              <div className="space-y-3">
                <label className="text-label-md text-on-surface uppercase tracking-widest">
                  Color:{' '}
                  <span className="text-on-surface-variant font-normal normal-case">{color}</span>
                </label>
                <div className="flex gap-3 flex-wrap">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c);
                        setImageIndex(0);
                      }}
                      className={`px-4 py-2 text-label-md border transition-all ${
                        color === c
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant hover:border-on-surface'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {product.sizes.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-label-md text-on-surface uppercase tracking-widest">Size</label>
                  <span className="text-label-md text-primary underline cursor-pointer">Size Guide</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => inStock && setSize(s)}
                      disabled={!inStock}
                      className={`inter w-10 h-10 flex items-center justify-center text-[11px] tracking-[1px] rounded-none transition-colors duration-300 ${
                        !inStock
                          ? 'size-oos border border-divider text-faded cursor-not-allowed'
                          : size === s
                            ? 'bg-primary text-on-primary border border-primary'
                            : 'border border-divider text-primary hover:border-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            {inStock && (
              <div className="space-y-3">
                <label className="text-label-md text-on-surface uppercase tracking-widest">
                  Quantity
                </label>
                <div className="inline-flex items-center border border-divider">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 flex items-center justify-center text-primary text-lg hover:bg-divider transition-colors duration-300"
                  >
                    −
                  </button>
                  <span className="inter w-9 h-9 flex items-center justify-center text-[13px] text-primary border-x border-divider">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                    className="w-9 h-9 flex items-center justify-center text-primary text-lg hover:bg-divider transition-colors duration-300"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleAddToBag}
              disabled={!inStock}
              className="w-full rounded bg-primary text-on-primary py-5 text-label-md uppercase tracking-[0.2em] hover:bg-primary-container transition-all active:scale-[0.98] duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inStock ? 'Add to Bag' : 'Sold Out'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className="w-full rounded border border-primary text-primary py-5 text-label-md uppercase tracking-[0.2em] hover:bg-primary hover:text-on-primary transition-all active:scale-[0.98] duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Buy it Now
            </button>
            <button
              onClick={() => requireAuth() && dispatch(toggleWishlist(product.id))}
              className="flex items-center justify-center gap-2 py-2 text-label-md uppercase text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className={`material-symbols-outlined ${wishlisted ? 'filled text-primary' : ''}`}>
                favorite
              </span>
              {wishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>
            {feedback && <p className="text-center text-body-sm text-primary">{feedback}</p>}
            <div className="flex items-center justify-center gap-2 mt-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              <span className="text-label-md">
                {Number(product.price) >= 250
                  ? 'Complimentary express shipping on this item'
                  : 'Free express shipping on orders over $250'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-outline-variant mt-8">
            <div className="flex border-b border-outline-variant overflow-x-auto hide-scrollbar">
              {(['details', 'reviews', 'shipping'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-4 text-label-md uppercase tracking-widest whitespace-nowrap capitalize ${
                    tab === t
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="py-6">
              {tab === 'details' && (
                <div className="space-y-4">
                  <p className="text-body-md text-on-surface-variant whitespace-pre-line">
                    {product.description}
                  </p>
                  <ul className="space-y-2 text-body-sm text-on-surface list-disc pl-4">
                    <li>Condition: {conditionLabel[product.condition]}</li>
                    <li>Category: {product.category.name}</li>
                    {product.brand && <li>Brand: {product.brand}</li>}
                    <li>{product.stock} in stock</li>
                  </ul>
                </div>
              )}
              {tab === 'reviews' && (
                <div className="space-y-8">
                  {(product.reviews ?? []).length === 0 && (
                    <p className="text-body-md text-on-surface-variant">
                      No reviews yet. Be the first to share your thoughts.
                    </p>
                  )}
                  {(product.reviews ?? []).map((review) => (
                    <div key={review.id} className="border-b border-outline-variant pb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Stars rating={review.rating} />
                        <span className="text-label-md uppercase text-on-surface-variant">
                          {review.user.firstName} {review.user.lastName[0]}.
                        </span>
                      </div>
                      {review.title && <p className="font-semibold text-body-md mb-1">{review.title}</p>}
                      {review.comment && (
                        <p className="text-body-md text-on-surface-variant">{review.comment}</p>
                      )}
                    </div>
                  ))}
                  {user && (
                    <form onSubmit={submitReview} className="space-y-4">
                      <h3 className="text-label-md uppercase tracking-widest">Write a review</h3>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setReviewRating(i)}
                            className={`material-symbols-outlined text-primary ${
                              reviewRating >= i ? 'filled' : ''
                            }`}
                          >
                            star
                          </button>
                        ))}
                      </div>
                      <input
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:ring-0 focus:outline-none"
                      />
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience…"
                        rows={3}
                        className="w-full border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:ring-0 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded bg-primary text-on-primary px-8 py-3 text-label-md uppercase tracking-widest hover:bg-primary-container transition-colors"
                      >
                        Submit Review
                      </button>
                      {reviewMessage && <p className="text-body-sm text-primary">{reviewMessage}</p>}
                    </form>
                  )}
                </div>
              )}
              {tab === 'shipping' && (
                <p className="text-body-md text-on-surface-variant">
                  Orders are processed within 1–2 business days. Express delivery typically takes 3–5
                  days globally. Returns are accepted within 30 days of delivery.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* You may also like */}
      {related.length > 0 && (
        <section className="mt-24">
          <div className="flex justify-between items-end mb-10">
            <div className="space-y-2">
              <span className="text-label-md text-primary uppercase tracking-[0.3em]">Curation</span>
              <h2 className="font-display text-headline-sm lg:text-headline-md text-on-surface">
                You May Also Like
              </h2>
            </div>
            <Link
              to={`/shop?category=${product.category.slug}`}
              className="text-label-md uppercase border-b border-on-surface pb-1 hover:text-primary transition-colors"
            >
              View Collection
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
