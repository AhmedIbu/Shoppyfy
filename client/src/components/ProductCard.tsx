import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Product, money } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../store/wishlistSlice';

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

  return (
    <div
      className="product-card-hover group cursor-pointer"
      onClick={() => navigate(`/products/${product.slug}`)}
    >
      <div className="relative overflow-hidden bg-surface-container-highest aspect-[3/4]">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {(isNew || preLoved || product.comparePrice) && (
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isNew && !preLoved && (
              <span className="bg-on-surface text-surface text-[10px] uppercase font-bold px-3 py-1 tracking-widest">
                New Arrival
              </span>
            )}
            {preLoved && (
              <span className="bg-primary text-on-primary text-[10px] uppercase font-bold px-3 py-1 tracking-widest">
                Pre-Loved
              </span>
            )}
            {product.comparePrice && (
              <span className="bg-error text-on-error text-[10px] uppercase font-bold px-3 py-1 tracking-widest">
                Sale
              </span>
            )}
          </div>
        )}
        {product.stock > 0 ? (
          <div className="quick-add absolute bottom-0 left-0 right-0 p-4">
            <button
              onClick={handleQuickAdd}
              disabled={adding}
              className="w-full bg-on-surface text-surface py-3 text-label-md uppercase hover:bg-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding…' : 'Quick Add'}
            </button>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface/80 text-center text-label-md uppercase text-on-surface-variant">
            Sold Out
          </div>
        )}
      </div>
      <div className="mt-6">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="font-display text-[20px] font-semibold leading-7 text-on-surface">
            {product.name}
          </h3>
          <button
            onClick={handleWishlist}
            aria-label="Toggle wishlist"
            className={`material-symbols-outlined transition-colors ${
              wishlisted ? 'filled text-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            favorite
          </button>
        </div>
        {product.brand && (
          <p className="text-label-md uppercase text-on-surface-variant mb-1">{product.brand}</p>
        )}
        <p className="text-body-md text-on-surface-variant">
          {money(product.price)}
          {product.comparePrice && (
            <span className="ml-2 line-through text-on-surface-variant/60">
              {money(product.comparePrice)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
