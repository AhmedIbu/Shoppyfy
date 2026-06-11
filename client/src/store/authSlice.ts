import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api, apiErrorMessage } from '../api/axios';
import { User } from '../types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err));
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ user: User }>('/auth/login', payload);
      return data.user;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role?: 'BUYER' | 'SELLER';
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<{ user: User }>('/auth/register', payload);
      return data.user;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = (action.payload as string) ?? 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = (action.payload as string) ?? 'Registration failed';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      });
  },
});

export const { setUser, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
