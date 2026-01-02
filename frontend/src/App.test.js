import { configureStore } from "@reduxjs/toolkit";
import authReducer, { initializeAuth } from "./redux/slices/authSlice";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
global.localStorage = localStorageMock;

describe("App Auth Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test("initializes auth from localStorage token and user", () => {
    const store = configureStore({
      reducer: { auth: authReducer },
    });

    localStorage.setItem("authToken", "test-token");
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        id: 1,
        name: "Test User",
        email: "test@elte.hu",
        major: "Informatika",
      })
    );

    // Simulate what App.jsx does in useEffect
    const token = localStorage.getItem("authToken");
    if (token) {
      const savedUser = localStorage.getItem("authUser");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          store.dispatch(initializeAuth(user));
        } catch (e) {
          store.dispatch(
            initializeAuth({
              id: 1,
              name: "Felhasználó",
              email: "user@elte.hu",
              major: "Informatika",
            })
          );
        }
      }
    }

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual({
      id: 1,
      name: "Test User",
      email: "test@elte.hu",
      major: "Informatika",
    });
  });

  test("does not initialize auth when no token", () => {
    const store = configureStore({
      reducer: { auth: authReducer },
    });

    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    // Simulate what App.jsx does in useEffect
    // No token, so no initialization happens
    const token = localStorage.getItem("authToken");
    expect(token).toBeNull();

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBe(null);
  });

  test("initializes with default user when token exists but no user data", () => {
    const store = configureStore({
      reducer: { auth: authReducer },
    });

    localStorage.setItem("authToken", "test-token");
    localStorage.removeItem("authUser");

    // Simulate what App.jsx does in useEffect
    const token = localStorage.getItem("authToken");
    if (token) {
      const savedUser = localStorage.getItem("authUser");
      if (!savedUser) {
        store.dispatch(
          initializeAuth({
            id: 1,
            name: "Felhasználó",
            email: "user@elte.hu",
            major: "Informatika",
          })
        );
      }
    }

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual({
      id: 1,
      name: "Felhasználó",
      email: "user@elte.hu",
      major: "Informatika",
    });
  });

  test("handles invalid JSON in authUser gracefully", () => {
    const store = configureStore({
      reducer: { auth: authReducer },
    });

    localStorage.setItem("authToken", "test-token");
    localStorage.setItem("authUser", "invalid-json");

    // Simulate what App.jsx does in useEffect
    const token = localStorage.getItem("authToken");
    if (token) {
      const savedUser = localStorage.getItem("authUser");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          store.dispatch(initializeAuth(user));
        } catch (e) {
          store.dispatch(
            initializeAuth({
              id: 1,
              name: "Felhasználó",
              email: "user@elte.hu",
              major: "Informatika",
            })
          );
        }
      }
    }

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual({
      id: 1,
      name: "Felhasználó",
      email: "user@elte.hu",
      major: "Informatika",
    });
  });
});
