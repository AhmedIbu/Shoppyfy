import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Product, money } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../store/wishlistSlice';
import { onImgError } from '../utils/imgFallback';

const NEW_WINDOW_DAYS = 30;

export default function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const wishlistItems = useAppSelector((s) => s.wishlist.items);
  const wishlisted = selectIsWishlisted(wishlistItems, product.id);
  const [adding, setAdding] = useState(false);

  const isNew =
    Date.now() - new Date(product.createdAt).getTime() < NEW_WINDOW_DAYS * 24 * 3600 * 1000;
  const preLoved = product.condition !== 'NEW';

  const requireAuth = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setAdding(true);
    try {
      await dispatch(
        addToCart({
          productId: product.id,
          quantity: 1,
          size: product.sizes[0],
          color: product.colors[0],
        })
      ).unwrap();
      toast.success('Added to bag');
    } catch {
      toast.error('Could not add to bag');
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    dispatch(toggleWishlist(product.id));
  };

  const almostGone = product.stock > 0 && product.stock <= 3;

  return (
    <div
      className="product-card-hover group cursor-pointer"
      onClick={() => navigate(`/products/${product.slug}`)}
    >
      <div className="relative overflow-hidden bg-surface-container-highest aspect-[3/4] border border-transparent group-hover:border-gold group-hover:shadow-lg transition-all duration-300">
        <img
          src={product.images[0]}
          alt={product.name}
          onError={onImgError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Status badge */}
        {(isNew || product.comparePrice || almostGone) && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {isNew && !preLoved && (
              <span className="inter bg-brand-green text-white text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
                New in
              </span>
            )}
            {product.comparePrice && (
              <span className="inter bg-brand-red text-white text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
                Sale
              </span>
            )}
            {almostGone && (
              <span className="inter bg-brand-red text-white text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
                Almost gone
              </span>
            )}
          </div>
        )}

        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          aria-label="Toggle wishlist"
          className={`material-symbols-outlined absolute top-2.5 right-2.5 text-[18px] transition-colors duration-300 ${
            wishlisted ? 'filled text-on-primary' : 'text-on-primary/80 hover:text-on-primary'
          }`}
        >
          favorite
        </button>

        {/* Quick Add — a small button pinned to the bottom, revealed on hover.
            It only covers the bottom strip, so clicking anywhere else on the
            card opens the product page. On mobile (no hover) it stays hidden
            and a tap always navigates. */}
        {product.stock > 0 ? (
          <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-300">
            <button
              onClick={handleQuickAdd}
              disabled={adding}
              className="w-full bg-primary text-on-primary py-2.5 text-[10px] tracking-[2px] uppercase font-medium hover:bg-primary-container transition-colors disabled:opacity-60"
            >
              {adding ? 'Adding…' : 'Quick Add'}
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
            <div className="w-full bg-on-surface/85 text-surface text-center py-2.5 text-[10px] tracking-[2px] uppercase">
              Sold Out
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        {product.brand && (
          <p className="inter text-[10px] tracking-[1px] uppercase text-muted mb-1">
            {product.brand}
          </p>
        )}
        <h3 className="font-display text-[20px] font-semibold leading-7 text-on-surface mb-1">
          {product.name}
        </h3>
        <p className="inter">
          <span className="font-medium text-[14px] text-primary">{money(product.price)}</span>
          {product.comparePrice && (
            <span className="text-[12px] text-accent line-through ml-1.5">
              {money(product.comparePrice)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
