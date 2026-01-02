import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import { store } from "./store";

describe("Redux Store", () => {
  it("should create store with auth reducer", () => {
    expect(store).toBeDefined();
    expect(store.getState()).toHaveProperty("auth");
  });

  it("should have initial auth state", () => {
    const state = store.getState();
    expect(state.auth).toEqual({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      initialized: false,
    });
  });

  it("should dispatch actions and update state", () => {
    const testStore = configureStore({
      reducer: {
        auth: authReducer,
      },
    });

    const initialState = testStore.getState();
    expect(initialState.auth.isAuthenticated).toBe(false);

    // Dispatch an action (using the actual action from authSlice)
    const { initializeAuth } = require("./slices/authSlice");
    testStore.dispatch(
      initializeAuth({
        id: 1,
        name: "Test User",
        email: "test@elte.hu",
      })
    );

    const updatedState = testStore.getState();
    expect(updatedState.auth.isAuthenticated).toBe(true);
    expect(updatedState.auth.user).toEqual({
      id: 1,
      name: "Test User",
      email: "test@elte.hu",
    });
  });

  it("should have correct store structure", () => {
    const state = store.getState();
    expect(state).toHaveProperty("auth");
    expect(typeof state.auth).toBe("object");
  });
});

