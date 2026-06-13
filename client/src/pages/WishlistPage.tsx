import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeFromWishlist } from '../store/wishlistSlice';
import { addToCart } from '../store/cartSlice';
import { money } from '../types';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

export default function WishlistPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.wishlist);

  if (loading && items.length === 0) return <Spinner label="Loading your wishlist" />;

  const moveToBag = async (productId: string, sizes: string[], colors: string[]) => {
    await dispatch(addToCart({ productId, quantity: 1, size: sizes[0], color: colors[0] }));
    dispatch(removeFromWishlist(productId));
  };

  const moveAllToBag = async () => {
    for (const item of items) {
      if (item.product.stock > 0) {
        await moveToBag(item.product.id, item.product.sizes, item.product.colors);
      }
    }
  };

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-12 md:py-16 min-h-[60vh]">
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-4">
        <div>
          <h1 className="font-display font-bold text-display-lg-mobile md:text-display-lg mb-2">
            Your Wishlist
          </h1>
          <p className="text-on-surface-variant text-body-md">
            {items.length} item{items.length === 1 ? '' : 's'} curated for your next look.
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={moveAllToBag}
              className="border border-primary text-primary px-6 py-3 text-label-md uppercase hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2"
            >
              Move All to Bag
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
          <span className="material-symbols-outlined text-[64px] text-outline-variant">favorite</span>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-headline-md">Nothing saved yet</h2>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Tap the heart on any piece you love and it will appear here for later.
            </p>
          </div>
          <Link
            to="/shop"
            className="mt-4 px-12 py-4 bg-primary text-on-primary text-label-md uppercase hover:bg-primary-container transition-all duration-300"
          >
            Discover the Curation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
          {items.map((item) => {
            const p = item.product;
            return (
              <div key={item.id} className="group relative flex flex-col">
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-4">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    onClick={() => navigate(`/products/${p.slug}`)}
                    onError={onImgError}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 pointer-events-none">
                    <button
                      onClick={() => dispatch(removeFromWishlist(p.id))}
                      aria-label="Remove from wishlist"
                      className="self-end bg-surface w-10 h-10 flex items-center justify-center rounded-pill shadow-lg hover:text-error transition-colors pointer-events-auto"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    {p.stock > 0 ? (
                      <button
                        onClick={() => moveToBag(p.id, p.sizes, p.colors)}
                        className="w-full bg-primary text-on-primary py-3 text-label-md uppercase hover:bg-primary-container transition-colors transform translate-y-4 group-hover:translate-y-0 duration-300 pointer-events-auto"
                      >
                        Move to Bag
                      </button>
                    ) : (
                      <div className="w-full bg-surface/90 text-on-surface-variant py-3 text-label-md uppercase text-center">
                        Sold Out
                      </div>
                    )}
                  </div>
                  {p.condition !== 'NEW' && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-on-primary px-2 py-1 text-label-md uppercase">
                        Pre-Loved
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {p.brand && (
                    <span className="text-label-md uppercase text-on-surface-variant tracking-wider">
                      {p.brand}
                    </span>
                  )}
                  <Link to={`/products/${p.slug}`}>
                    <h3 className="font-display text-headline-sm hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="text-body-md text-on-surface mt-1">{money(p.price)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
