import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, apiErrorMessage } from '../api/axios';
import { Cart } from '../types';

interface CartResponse {
  cart: Cart;
  subtotal: number;
  itemCount: number;
}

interface CartState {
  cart: Cart | null;
  subtotal: number;
  itemCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cart: null,
  subtotal: 0,
  itemCount: 0,
  loading: false,
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<CartResponse>('/cart');
    return data;
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err));
  }
});

export const addToCart = createAsyncThunk(
  'cart/add',
  async (
    payload: { productId: string; quantity?: number; size?: string; color?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<CartResponse>('/cart/items', payload);
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async (payload: { itemId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch<CartResponse>(`/cart/items/${payload.itemId}`, {
        quantity: payload.quantity,
      });
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.delete<CartResponse>(`/cart/items/${itemId}`);
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const clearCart = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.delete<CartResponse>('/cart');
    return data;
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err));
  }
});

const applyCart = (state: CartState, payload: CartResponse) => {
  state.cart = payload.cart;
  state.subtotal = payload.subtotal;
  state.itemCount = payload.itemCount;
  state.loading = false;
  state.error = null;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart: () => initialState,
  },
  extraReducers: (builder) => {
    for (const thunk of [fetchCart, addToCart, updateCartItem, removeCartItem, clearCart]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          applyCart(state, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = (action.payload as string) ?? 'Cart error';
        });
    }
  },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
