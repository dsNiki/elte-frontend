import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Calendar from "./Calendar";
import { eventService, authService } from "../../services/api";

// Mock the API services
jest.mock("../../services/api", () => ({
  eventService: {
    getEvents: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
  authService: {
    getUser: jest.fn(),
  },
}));

// Mock window.confirm
global.window.confirm = jest.fn(() => true);

describe("Calendar Component", () => {
  const mockOnClose = jest.fn();
  const mockGroupId = 1;

  // Suppress console errors for tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService.getUser.mockReturnValue({ id: 1, name: "Test User" });
  });

  it("should render calendar dialog when open", async () => {
    eventService.getEvents.mockResolvedValue([]);

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    expect(screen.getByText("Naptár")).toBeInTheDocument();
  });

  it("should not render calendar when closed", () => {
    render(
      <Calendar open={false} onClose={mockOnClose} groupId={mockGroupId} />
    );

    expect(screen.queryByText("Naptár")).not.toBeInTheDocument();
  });

  it("should fetch events when opened", async () => {
    const mockEvents = [
      {
        id: 1,
        title: "Test Event",
        date: "2025-01-15T10:00:00Z",
        description: "Test description",
        location: "Test location",
        creator_id: 1,
      },
    ];

    eventService.getEvents.mockResolvedValue(mockEvents);

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    await waitFor(() => {
      expect(eventService.getEvents).toHaveBeenCalledWith(mockGroupId);
    });
  });

  it("should display loading state while fetching events", async () => {
    eventService.getEvents.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    // Check for loading indicator (CircularProgress)
    const loadingIndicator = screen.getByRole("progressbar");
    expect(loadingIndicator).toBeInTheDocument();
  });

  it("should display month navigation buttons", async () => {
    eventService.getEvents.mockResolvedValue([]);

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    await waitFor(() => {
      const prevButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg[data-testid="ChevronLeftIcon"]')
      );
      const nextButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg[data-testid="ChevronRightIcon"]')
      );

      expect(prevButton).toBeDefined();
      expect(nextButton).toBeDefined();
    });
  });

  it("should close dialog when close button is clicked", async () => {
    eventService.getEvents.mockResolvedValue([]);

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    await waitFor(() => {
      const closeButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg[data-testid="CloseIcon"]')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
      }
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should display error message when event fetch fails", async () => {
    eventService.getEvents.mockRejectedValue({
      response: { data: { error: "Fetch failed" } },
    });

    await act(async () => {
      render(
        <Calendar open={true} onClose={mockOnClose} groupId={mockGroupId} />
      );
    });

    await waitFor(() => {
      // The error message should be "Fetch failed" based on the mock
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });
});
