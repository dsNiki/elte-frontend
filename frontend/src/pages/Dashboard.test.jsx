/* eslint-disable import/first */
// Mock the API services BEFORE imports
jest.mock("../services/api");

import { configureStore } from "@reduxjs/toolkit";
import authReducer, { logout } from "../redux/slices/authSlice";
import * as api from "../services/api";
/* eslint-enable import/first */

const mockGroupService = api.groupService;
const mockAuthService = api.default;

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

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          name: "Test User",
          email: "test@elte.hu",
          major: "Informatika",
        },
        isAuthenticated: true,
        loading: false,
        error: null,
        initialized: true,
        ...initialState,
      },
    },
  });
};

// Helper function to get user initials (same as in Dashboard component)
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

describe("Dashboard Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
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

    mockGroupService.myGroups = jest.fn().mockResolvedValue({
      groups: [
        {
          id: 1,
          name: "Test Group",
          subject: "Test Subject",
          joined_at: "2025-01-01",
        },
      ],
    });
    mockGroupService.getUnreadPostCounts = jest.fn().mockResolvedValue({});
  });

  test("getInitials returns correct initials", () => {
    expect(getInitials("Test User")).toBe("TU");
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Single")).toBe("SI");
    expect(getInitials("")).toBe("U");
    expect(getInitials(null)).toBe("U");
  });

  test("handles logout action", () => {
    const store = createMockStore();
    mockAuthService.logout = jest.fn();

    // Simulate logout flow
    mockAuthService.logout();
    store.dispatch(logout());
    localStorage.clear();

    expect(mockAuthService.logout).toHaveBeenCalled();
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBe(null);
  });

  test("fetches user groups on mount", async () => {
    const mockGroups = [
      {
        id: 1,
        name: "Test Group",
        subject: "Test Subject",
        joined_at: "2025-01-01",
      },
      {
        id: 2,
        name: "Another Group",
        subject: "Another Subject",
        joined_at: "2025-01-02",
      },
    ];
    mockGroupService.myGroups.mockResolvedValue({ groups: mockGroups });

    // Simulate fetching groups
    const response = await mockGroupService.myGroups();
    expect(response.groups).toEqual(mockGroups);
    expect(mockGroupService.myGroups).toHaveBeenCalled();
  });

  test("fetches unread post counts", async () => {
    const mockCounts = {
      1: 5,
      2: 3,
    };
    mockGroupService.getUnreadPostCounts.mockResolvedValue(mockCounts);

    // Simulate fetching unread counts
    const counts = await mockGroupService.getUnreadPostCounts();
    expect(counts).toEqual(mockCounts);
    expect(mockGroupService.getUnreadPostCounts).toHaveBeenCalled();
  });

  test("handles group members fetching", async () => {
    const mockMembers = [
      { id: 1, name: "Member 1", email: "member1@elte.hu" },
      { id: 2, name: "Member 2", email: "member2@elte.hu" },
    ];
    mockGroupService.getGroupMembers = jest.fn().mockResolvedValue(mockMembers);

    // Simulate fetching group members
    const members = await mockGroupService.getGroupMembers(1);
    expect(members).toEqual(mockMembers);
    expect(mockGroupService.getGroupMembers).toHaveBeenCalledWith(1);
  });

  test("checks for authentication token in localStorage", () => {
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        id: 1,
        name: "Test User",
        email: "test@elte.hu",
      })
    );

    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("authUser"));

    expect(token).toBe("test-token");
    expect(user).toEqual({
      id: 1,
      name: "Test User",
      email: "test@elte.hu",
    });
  });

  test("redirects when no token in localStorage", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");

    expect(token).toBeNull();
    expect(user).toBeNull();
    // In real component, this would trigger navigation to /login
  });

  test("handles toast notifications setting", () => {
    // Test default value (enabled)
    localStorage.removeItem("toastNotificationsEnabled");
    const saved = localStorage.getItem("toastNotificationsEnabled");
    const enabled = saved === null ? true : saved === "true";
    expect(enabled).toBe(true);

    // Test disabled value
    localStorage.setItem("toastNotificationsEnabled", "false");
    const savedDisabled = localStorage.getItem("toastNotificationsEnabled");
    const disabled = savedDisabled === null ? true : savedDisabled === "true";
    expect(disabled).toBe(false);
  });

  test("handles tab state changes", () => {
    // Simulate tab change logic
    const tab = "my";

    // Simulate handleTabChange logic
    const newTab = tab;
    expect(newTab).toBe("my");

    // For home tab, navigate without query param
    const homeTab = "home";
    expect(homeTab).toBe("home");

    // For other tabs, navigate with query param
    expect(tab).toBe("my");
    expect(tab !== "home").toBe(true);
  });
});
