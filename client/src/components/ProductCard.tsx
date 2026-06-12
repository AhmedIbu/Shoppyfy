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
      <div className="relative overflow-hidden bg-surface-container-highest aspect-[3/4]">
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
              <span className="inter bg-primary text-on-primary text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
                New in
              </span>
            )}
            {product.comparePrice && (
              <span className="inter bg-divider text-accent text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
                Sale
              </span>
            )}
            {almostGone && (
              <span className="inter bg-primary text-on-primary text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-none">
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

        {/* Hover overlay with quick add */}
        {product.stock > 0 ? (
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            className="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center disabled:cursor-not-allowed"
          >
            <span className="inter text-[10px] tracking-[2px] uppercase text-on-primary border-b border-on-primary/80 pb-0.5">
              {adding ? 'Adding…' : 'Quick Add'}
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="inter text-[10px] tracking-[2px] uppercase text-on-primary/80">
              Sold Out
            </span>
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
