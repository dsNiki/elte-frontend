import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false, // Tracks if auth state has been initialized from localStorage
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Bejelentkezés kezdete
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    // Bejelentkezés sikeres
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    // Bejelentkezés hiba
    loginFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.error = action.payload;
    },
    // Regisztráció sikeres
    registerSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    // Kijelentkezés
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    // Error törlése
    clearError: (state) => {
      state.error = null;
    },
    // Token alapú inicializálás (oldal frissítéskor)
    initializeAuth: (state, action) => {
      if (action.payload) {
        state.isAuthenticated = true;
        state.user = action.payload;
      } else {
        state.isAuthenticated = false;
        state.user = null;
      }
      state.initialized = true; // Mark as initialized
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerSuccess,
  logout,
  clearError,
  initializeAuth,
} = authSlice.actions;

export default authSlice.reducer;
