import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SubjectGroupSearch from "./SubjectGroupSearch";
import { subjectService, groupService } from "../services/api";

// Suppress console.error immediately to prevent it from showing in tests
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock the API services
jest.mock("../services/api", () => ({
  subjectService: {
    searchSubjects: jest.fn(),
  },
  groupService: {
    searchGroups: jest.fn(),
    joinGroup: jest.fn(),
    getGroupMembers: jest.fn(),
  },
}));

describe("SubjectGroupSearch Component", () => {
  afterAll(() => {
    // Restore console.error after all tests
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the search form", () => {
    render(<SubjectGroupSearch />);

    expect(
      screen.getByText("Tantárgy alapú csoportkeresés")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Tantárgy neve vagy kódja/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Keresés")).toBeInTheDocument();
  });

  it("should search for subjects when form is submitted", async () => {
    const mockSubjects = [
      { code: "ABC123", name: "Test Subject 1" },
      { code: "DEF456", name: "Test Subject 2" },
    ];

    subjectService.searchSubjects.mockResolvedValue(mockSubjects);

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Test" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(subjectService.searchSubjects).toHaveBeenCalledWith("Test");
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Subject 1/i)).toBeInTheDocument();
    });
  });

  it("should display subjects after search", async () => {
    const mockSubjects = [
      { code: "ABC123", name: "Mathematics" },
      { code: "DEF456", name: "Physics" },
    ];

    subjectService.searchSubjects.mockResolvedValue(mockSubjects);

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Math" } });
    fireEvent.click(searchButton);

    await waitFor(
      () => {
        // The component displays "Tantárgy: {name}", so we search for the name part
        expect(screen.getByText(/Mathematics/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should load groups when subject is selected", async () => {
    const mockSubjects = [{ code: "ABC123", name: "Mathematics" }];
    const mockGroups = {
      all_groups: [
        { id: 1, name: "Group 1", subject: "Mathematics", member_count: 3 },
      ],
    };

    subjectService.searchSubjects.mockResolvedValue(mockSubjects);
    groupService.searchGroups.mockResolvedValue(mockGroups);

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Math" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      // The button text is "Tantárgy: Mathematics", so we search for the name part
      expect(screen.getByText(/Tantárgy:.*Mathematics/i)).toBeInTheDocument();
    });

    const subjectButton = screen.getByText(/Tantárgy:.*Mathematics/i);
    fireEvent.click(subjectButton);

    await waitFor(() => {
      expect(groupService.searchGroups).toHaveBeenCalledWith("Mathematics");
    });
  });

  it("should display groups after subject selection", async () => {
    const mockSubjects = [{ code: "ABC123", name: "Mathematics" }];
    const mockGroups = {
      all_groups: [
        {
          id: 1,
          name: "Math Study Group",
          subject: "Mathematics",
          member_count: 3,
        },
      ],
    };

    subjectService.searchSubjects.mockResolvedValue(mockSubjects);
    groupService.searchGroups.mockResolvedValue(mockGroups);

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Math" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      // The button text is "Tantárgy: Mathematics", so we search for the name part
      expect(screen.getByText(/Tantárgy:.*Mathematics/i)).toBeInTheDocument();
    });

    const subjectButton = screen.getByText(/Tantárgy:.*Mathematics/i);
    fireEvent.click(subjectButton);

    await waitFor(() => {
      expect(screen.getByText(/Math Study Group/i)).toBeInTheDocument();
    });
  });

  it("should join a group when join button is clicked", async () => {
    const mockSubjects = [{ code: "ABC123", name: "Mathematics" }];
    const mockGroups = {
      all_groups: [
        {
          id: 1,
          name: "Group 1",
          subject: "Mathematics",
          member_count: 2,
          is_member: false,
        },
      ],
    };

    subjectService.searchSubjects.mockResolvedValue(mockSubjects);
    groupService.searchGroups.mockResolvedValue(mockGroups);
    groupService.joinGroup.mockResolvedValue({ success: true });

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Math" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      // The button text is "Tantárgy: Mathematics", so we search for the name part
      expect(screen.getByText(/Tantárgy:.*Mathematics/i)).toBeInTheDocument();
    });

    const subjectButton = screen.getByText(/Tantárgy:.*Mathematics/i);
    fireEvent.click(subjectButton);

    await waitFor(() => {
      expect(screen.getByText("Csatlakozás")).toBeInTheDocument();
    });

    const joinButton = screen.getByText("Csatlakozás");
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(groupService.joinGroup).toHaveBeenCalledWith(1);
    });
  });

  it("should display error message when search fails", async () => {
    subjectService.searchSubjects.mockRejectedValue(new Error("Search failed"));

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Test" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Nem sikerült/i)).toBeInTheDocument();
    });
  });

  it("should show loading state while searching", async () => {
    subjectService.searchSubjects.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SubjectGroupSearch />);

    const searchInput = screen.getByLabelText(/Tantárgy neve vagy kódja/i);
    const searchButton = screen.getByText("Keresés");

    fireEvent.change(searchInput, { target: { value: "Test" } });
    fireEvent.click(searchButton);

    // Check for loading indicator
    await waitFor(() => {
      const loadingIndicator = screen.getByRole("progressbar");
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  it("should not search with empty query", () => {
    render(<SubjectGroupSearch />);

    const searchButton = screen.getByText("Keresés");
    fireEvent.click(searchButton);

    expect(subjectService.searchSubjects).not.toHaveBeenCalled();
  });
});
