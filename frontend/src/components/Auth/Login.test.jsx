// Mock the API service
jest.mock("../../services/api");

import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  clearError,
} from "../../redux/slices/authSlice";
import * as api from "../../services/api";

const mockAuthService = api.default;

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        initialized: false,
        ...initialState,
      },
    },
  });
};

// Email validation function (same as in Login component)
const validateEmail = (email) => {
  return email.endsWith("@elte.hu") || email.endsWith("@student.elte.hu");
};

describe("Login Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.login = jest.fn();
  });

  test("validates email correctly", () => {
    expect(validateEmail("test@elte.hu")).toBe(true);
    expect(validateEmail("test@student.elte.hu")).toBe(true);
    expect(validateEmail("test@gmail.com")).toBe(false);
    expect(validateEmail("test@example.com")).toBe(false);
  });

  test("dispatches loginFailure when email is empty", () => {
    const store = createMockStore();
    const formData = { email: "", password: "password123" };

    // Simulate validation logic
    if (!formData.email || !formData.password) {
      store.dispatch(loginFailure("Töltsd ki az összes mezőt!"));
    }

    const state = store.getState();
    expect(state.auth.error).toBe("Töltsd ki az összes mezőt!");
  });

  test("dispatches loginFailure when password is empty", () => {
    const store = createMockStore();
    const formData = { email: "test@elte.hu", password: "" };

    // Simulate validation logic
    if (!formData.email || !formData.password) {
      store.dispatch(loginFailure("Töltsd ki az összes mezőt!"));
    }

    const state = store.getState();
    expect(state.auth.error).toBe("Töltsd ki az összes mezőt!");
  });

  test("dispatches loginFailure for invalid email domain", () => {
    const store = createMockStore();
    const formData = { email: "test@gmail.com", password: "password123" };

    // Simulate validation logic
    if (!validateEmail(formData.email)) {
      store.dispatch(
        loginFailure("Csak ELTE email cím fogadható el (@elte.hu)")
      );
    }

    const state = store.getState();
    expect(state.auth.error).toBe(
      "Csak ELTE email cím fogadható el (@elte.hu)"
    );
  });

  test("dispatches loginStart on valid form", () => {
    const store = createMockStore();
    const formData = { email: "test@elte.hu", password: "password123" };

    // Simulate validation logic
    if (formData.email && formData.password && validateEmail(formData.email)) {
      store.dispatch(loginStart());
    }

    const state = store.getState();
    expect(state.auth.loading).toBe(true);
    expect(state.auth.error).toBe(null);
  });

  test("dispatches loginSuccess on successful API call", async () => {
    const store = createMockStore();
    const mockUser = { id: 1, name: "Test User", email: "test@elte.hu" };
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: "test-token",
    });

    // Simulate login flow
    store.dispatch(loginStart());
    const response = await mockAuthService.login("test@elte.hu", "password123");
    store.dispatch(loginSuccess(response.user));

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual(mockUser);
    expect(state.auth.loading).toBe(false);
    expect(mockAuthService.login).toHaveBeenCalledWith(
      "test@elte.hu",
      "password123"
    );
  });

  test("dispatches loginFailure on API error", async () => {
    const store = createMockStore();
    mockAuthService.login.mockRejectedValue("Hibás bejelentkezési adatok");

    // Simulate login flow
    store.dispatch(loginStart());
    try {
      await mockAuthService.login("test@elte.hu", "wrongpassword");
    } catch (err) {
      store.dispatch(loginFailure(err));
    }

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.error).toBe("Hibás bejelentkezési adatok");
    expect(state.auth.loading).toBe(false);
  });

  test("clears error when clearError is dispatched", () => {
    const store = createMockStore({ error: "Some error" });
    expect(store.getState().auth.error).toBe("Some error");

    store.dispatch(clearError());
    expect(store.getState().auth.error).toBe(null);
  });
});
