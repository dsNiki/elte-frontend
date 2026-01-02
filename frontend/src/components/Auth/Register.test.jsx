/* eslint-disable import/first */
// Mock the API service BEFORE imports
jest.mock("../../services/api");

import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  loginStart,
  registerSuccess,
  loginFailure,
  clearError,
} from "../../redux/slices/authSlice";
import * as api from "../../services/api";
/* eslint-enable import/first */

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

// Email validation function (same as in Register component)
const validateEmail = (email) => {
  return email.endsWith("@elte.hu") || email.endsWith("@student.elte.hu");
};

describe("Register Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.register = jest.fn();
  });

  test("validates email correctly", () => {
    expect(validateEmail("test@elte.hu")).toBe(true);
    expect(validateEmail("test@student.elte.hu")).toBe(true);
    expect(validateEmail("test@gmail.com")).toBe(false);
    expect(validateEmail("test@example.com")).toBe(false);
  });

  test("dispatches loginFailure when required fields are empty", () => {
    const store = createMockStore();
    const formData = {
      name: "",
      email: "test@elte.hu",
      password: "password123",
      confirmPassword: "password123",
    };

    // Simulate validation logic
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      store.dispatch(loginFailure("Töltsd ki az összes mezőt!"));
    }

    const state = store.getState();
    expect(state.auth.error).toBe("Töltsd ki az összes mezőt!");
  });

  test("dispatches loginFailure for invalid email domain", () => {
    const store = createMockStore();
    const formData = {
      name: "Test User",
      email: "test@gmail.com",
      password: "password123",
      confirmPassword: "password123",
    };

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

  test("dispatches loginFailure when password is too short", () => {
    const store = createMockStore();
    const formData = {
      name: "Test User",
      email: "test@elte.hu",
      password: "12345",
      confirmPassword: "12345",
    };

    // Simulate validation logic
    if (formData.password.length < 6) {
      store.dispatch(loginFailure("A jelszó minimum 6 karakter hosszú"));
    }

    const state = store.getState();
    expect(state.auth.error).toBe("A jelszó minimum 6 karakter hosszú");
  });

  test("dispatches loginFailure when passwords do not match", () => {
    const store = createMockStore();
    const formData = {
      name: "Test User",
      email: "test@elte.hu",
      password: "password123",
      confirmPassword: "password456",
    };

    // Simulate validation logic
    if (formData.password !== formData.confirmPassword) {
      store.dispatch(loginFailure("A jelszavak nem egyeznek!"));
    }

    const state = store.getState();
    expect(state.auth.error).toBe("A jelszavak nem egyeznek!");
  });

  test("dispatches loginStart on valid form", () => {
    const store = createMockStore();
    const formData = {
      name: "Test User",
      email: "test@elte.hu",
      password: "password123",
      confirmPassword: "password123",
    };

    // Simulate validation logic
    if (
      formData.name &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      validateEmail(formData.email) &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword
    ) {
      store.dispatch(loginStart());
    }

    const state = store.getState();
    expect(state.auth.loading).toBe(true);
    expect(state.auth.error).toBe(null);
  });

  test("dispatches registerSuccess on successful API call", async () => {
    const store = createMockStore();
    const mockUser = { id: 1, name: "Test User", email: "test@elte.hu" };
    mockAuthService.register.mockResolvedValue({
      user: mockUser,
      token: "test-token",
    });

    // Simulate registration flow
    store.dispatch(loginStart());
    const response = await mockAuthService.register(
      "test@elte.hu",
      "password123",
      "Test User",
      "Informatika",
      []
    );
    store.dispatch(registerSuccess(response.user));

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual(mockUser);
    expect(state.auth.loading).toBe(false);
    expect(mockAuthService.register).toHaveBeenCalledWith(
      "test@elte.hu",
      "password123",
      "Test User",
      "Informatika",
      []
    );
  });

  test("dispatches loginFailure on API error", async () => {
    const store = createMockStore();
    mockAuthService.register.mockRejectedValue({
      error: "Email már használatban van",
    });

    // Simulate registration flow
    store.dispatch(loginStart());
    try {
      await mockAuthService.register(
        "test@elte.hu",
        "password123",
        "Test User",
        "Informatika",
        []
      );
    } catch (err) {
      const errorMessage =
        err.error || err.message || "Regisztráció sikertelen!";
      store.dispatch(loginFailure(errorMessage));
    }

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.error).toBe("Email már használatban van");
    expect(state.auth.loading).toBe(false);
  });

  test("includes hobbies in registration call", async () => {
    const store = createMockStore();
    const mockUser = { id: 1, name: "Test User", email: "test@elte.hu" };
    mockAuthService.register.mockResolvedValue({
      user: mockUser,
      token: "test-token",
    });

    // Simulate registration with hobbies
    store.dispatch(loginStart());
    const response = await mockAuthService.register(
      "test@elte.hu",
      "password123",
      "Test User",
      "Informatika",
      ["Sport", "Zene"]
    );
    store.dispatch(registerSuccess(response.user));

    expect(mockAuthService.register).toHaveBeenCalledWith(
      "test@elte.hu",
      "password123",
      "Test User",
      "Informatika",
      ["Sport", "Zene"]
    );

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual(mockUser);
  });

  test("clears error when clearError is dispatched", () => {
    const store = createMockStore({ error: "Some error" });
    expect(store.getState().auth.error).toBe("Some error");

    store.dispatch(clearError());
    expect(store.getState().auth.error).toBe(null);
  });
});
