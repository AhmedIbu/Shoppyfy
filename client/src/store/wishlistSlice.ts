import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, apiErrorMessage } from '../api/axios';
import { WishlistItem } from '../types';

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<{ items: WishlistItem[] }>('/wishlist');
    return data.items;
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err));
  }
});

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggle',
  async (productId: string, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post<{ added: boolean; productId: string }>(
        `/wishlist/${productId}`
      );
      await dispatch(fetchWishlist());
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/remove',
  async (productId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      return productId;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlist: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Wishlist error';
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.product.id !== action.payload);
      });
  },
});

export const { resetWishlist } = wishlistSlice.actions;

export const selectIsWishlisted = (items: WishlistItem[], productId: string) =>
  items.some((item) => item.product.id === productId);

export default wishlistSlice.reducer;
